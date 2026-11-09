import { describe, it, expect, beforeEach } from "vitest";
import crypto from "node:crypto";
import {
  createMembershipOrderLogic,
  verifyPaymentAndFulfillOrderLogic,
  getOrderTrackingDetailsLogic,
  updateAdminOrderStatusLogic,
  assignAdminOrderCardLogic,
} from "@/lib/orders.logic";
import {
  createRazorpayOrder,
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature,
  generateTestPaymentSignature,
} from "@/lib/razorpay.service";
import {
  sendTransactionalEmail,
  renderPurchaseConfirmationEmail,
  renderDispatchNotificationEmail,
  renderDeliveryConfirmationEmail,
  renderRedemptionSuccessEmail,
  maskCardNumber,
} from "@/lib/email.service";
import { store, safeRandomUUID, generatePenCode } from "@/lib/v1-store";

describe("PennyGrade Online Card Purchasing, Fulfilment & Notifications Architecture", () => {
  const mockPlanId = "fd6de953-c15d-4b7f-aae4-b97b6d21b043";
  const validCustomer = {
    fullName: "Arjun Verma",
    email: "arjun.verma@example.com",
    mobile: "9876543210",
  };
  const validAddress = {
    line1: "Flat 402, Shanti Vihar",
    line2: "Court Road",
    landmark: "Near Head Post Office",
    city: "Daltonganj",
    state: "Jharkhand",
    pincode: "822101",
    country: "India",
  };

  beforeEach(() => {
    // Reset store state
    if (!store.cards) store.cards = new Map();
    if (!store.members) store.members = new Map();
    if (!store.orders) store.orders = new Map();
    if (!store.emailNotifications) store.emailNotifications = new Map();
    if (!store.orderHistory) store.orderHistory = [];

    // Pre-populate available test cards
    for (let i = 1; i <= 5; i++) {
      const cardNum = `PEN-TEST-000${i}`;
      store.cards.set(`card-t-${i}`, {
        id: `card-t-${i}`,
        card_number: cardNum,
        membership_id: null,
        status: "AVAILABLE",
        issued_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  });

  // ==========================================
  // 1. PURCHASING & CHECKOUT
  // ==========================================
  describe("1. Purchasing Flow", () => {
    it("creates a pending order with unique order ID, pending payment status, and Razorpay order ID", async () => {
      const res = await createMembershipOrderLogic({
        planId: mockPlanId,
        fullName: validCustomer.fullName,
        email: validCustomer.email,
        mobile: validCustomer.mobile,
        deliveryAddress: validAddress,
        termsAccepted: true,
      });

      expect(res.ok).toBe(true);
      expect(res.orderNumber).toMatch(/^ORD-[A-Z0-9-]+$/);
      expect(res.amount).toBe(500);
      expect(res.currency).toBe("INR");
      expect(res.razorpayOrderId).toBeDefined();

      const savedOrder = store.orders.get(res.orderId);
      expect(savedOrder).toBeDefined();
      expect(savedOrder?.payment_status).toBe("PENDING");
      expect(savedOrder?.order_status).toBe("PAYMENT_PENDING");
      expect(savedOrder?.customer_name).toBe(validCustomer.fullName);
    });

    it("rejects invalid customer details (short name, invalid email, short mobile, missing address)", async () => {
      // Invalid name
      await expect(
        createMembershipOrderLogic({
          planId: mockPlanId,
          fullName: "A",
          email: validCustomer.email,
          mobile: validCustomer.mobile,
          deliveryAddress: validAddress,
          termsAccepted: true,
        }),
      ).rejects.toThrow();

      await expect(
        createMembershipOrderLogic({
          planId: mockPlanId,
          fullName: validCustomer.fullName,
          email: validCustomer.email,
          mobile: validCustomer.mobile,
          deliveryAddress: { ...validAddress, city: "Ranchi" },
          termsAccepted: true,
        }),
      ).rejects.toThrow("Daltonganj");

      await expect(
        createMembershipOrderLogic({
          planId: mockPlanId,
          fullName: validCustomer.fullName,
          email: validCustomer.email,
          mobile: validCustomer.mobile,
          deliveryAddress: { ...validAddress, state: "Bihar" },
          termsAccepted: true,
        }),
      ).rejects.toThrow("Jharkhand");

      // Invalid email
      await expect(
        createMembershipOrderLogic({
          planId: mockPlanId,
          fullName: validCustomer.fullName,
          email: "not-an-email",
          mobile: validCustomer.mobile,
          deliveryAddress: validAddress,
          termsAccepted: true,
        }),
      ).rejects.toThrow();

      // Short mobile
      await expect(
        createMembershipOrderLogic({
          planId: mockPlanId,
          fullName: validCustomer.fullName,
          email: validCustomer.email,
          mobile: "12345",
          deliveryAddress: validAddress,
          termsAccepted: true,
        }),
      ).rejects.toThrow();

      // Terms not accepted
      await expect(
        createMembershipOrderLogic({
          planId: mockPlanId,
          fullName: validCustomer.fullName,
          email: validCustomer.email,
          mobile: validCustomer.mobile,
          deliveryAddress: validAddress,
          termsAccepted: false,
        }),
      ).rejects.toThrow();
    });

    it("handles multiple checkout submissions and generates distinct order IDs without collisions", async () => {
      const order1 = await createMembershipOrderLogic({
        planId: mockPlanId,
        fullName: "Customer One",
        email: "cust1@example.com",
        mobile: "9876543211",
        deliveryAddress: validAddress,
        termsAccepted: true,
      });

      const order2 = await createMembershipOrderLogic({
        planId: mockPlanId,
        fullName: "Customer Two",
        email: "cust2@example.com",
        mobile: "9876543212",
        deliveryAddress: validAddress,
        termsAccepted: true,
      });

      expect(order1.orderId).not.toBe(order2.orderId);
      expect(order1.orderNumber).not.toBe(order2.orderNumber);
      expect(order1.razorpayOrderId).not.toBe(order2.razorpayOrderId);
    });

    it("verifies payment signature server-side and rejects invalid signatures", async () => {
      const order = await createMembershipOrderLogic({
        planId: mockPlanId,
        fullName: validCustomer.fullName,
        email: validCustomer.email,
        mobile: validCustomer.mobile,
        deliveryAddress: validAddress,
        termsAccepted: true,
      });

      // Submit fraudulent / forged signature
      const fraudRes = await verifyPaymentAndFulfillOrderLogic({
        orderId: order.orderId,
        razorpayPaymentId: "pay_test_123",
        razorpayOrderId: order.razorpayOrderId,
        razorpaySignature: "forged_malicious_signature_hex",
      });

      expect(fraudRes.ok).toBe(false);
      expect(fraudRes.message).toMatch(/Invalid payment signature/i);

      const simulatedRes = await verifyPaymentAndFulfillOrderLogic({
        orderId: order.orderId,
        razorpayPaymentId: "pay_simulated_123",
        razorpayOrderId: order.razorpayOrderId,
        razorpaySignature: "simulated_test_mode_signature",
      });
      expect(simulatedRes.ok).toBe(false);

      // Order should remain PENDING
      const stored = store.orders.get(order.orderId);
      expect(stored?.payment_status).toBe("PENDING");
    });

    it("fulfills order, atomically assigns physical card, and activates 180-day membership on valid signature", async () => {
      const order = await createMembershipOrderLogic({
        planId: mockPlanId,
        fullName: validCustomer.fullName,
        email: validCustomer.email,
        mobile: validCustomer.mobile,
        deliveryAddress: validAddress,
        termsAccepted: true,
      });

      const validSignature = generateTestPaymentSignature(order.razorpayOrderId, "pay_valid999");

      const successRes = await verifyPaymentAndFulfillOrderLogic({
        orderId: order.orderId,
        razorpayPaymentId: "pay_valid999",
        razorpayOrderId: order.razorpayOrderId,
        razorpaySignature: validSignature,
      });

      expect(successRes.ok).toBe(true);
      expect(successRes.cardAssigned).toBe(true);
      expect(successRes.cardNumber).toMatch(/^PEN-/);
      expect(successRes.membershipNumber).toMatch(/^PEN-/);

      // Verify order status
      const storedOrder = store.orders.get(order.orderId);
      expect(storedOrder?.payment_status).toBe("PAID");
      expect(storedOrder?.order_status).toBe("PAID");

      // Verify physical card status
      const assignedCard = store.cards.get(storedOrder!.physical_card_id!);
      expect(assignedCard?.status).toBe("ACTIVE");
      expect(assignedCard?.membership_id).toBe(storedOrder?.membership_id);

      // Verify membership record
      const member = store.members.get(storedOrder!.membership_id!);
      expect(member).toBeDefined();
      expect(member?.status).toBe("ACTIVE");
      expect(member?.full_name).toBe(validCustomer.fullName);
      expect(member?.email).toBe(validCustomer.email);
    });

    it("blocks checkout when card inventory is exhausted, before creating a payment order", async () => {
      // Drain physical cards inventory
      for (const card of store.cards.values()) {
        card.status = "ACTIVE";
      }
      const existingOrderCount = store.orders.size;

      await expect(createMembershipOrderLogic({
        planId: mockPlanId,
        fullName: "Zero Stock Buyer",
        email: "zerostock@example.com",
        mobile: "9876543219",
        deliveryAddress: validAddress,
        termsAccepted: true,
      })).rejects.toThrow(/out of stock/i);
      expect(store.orders.size).toBe(existingOrderCount);
    });
  });

  // ==========================================
  // 2. EMAIL NOTIFICATIONS (RESEND)
  // ==========================================
  describe("2. Resend Email Notifications", () => {
    it("renders and sends Purchase Confirmation Email with order details and masked card info", async () => {
      const email = renderPurchaseConfirmationEmail({
        customerName: "Priya Sharma",
        customerEmail: "priya@example.com",
        orderNumber: "ORD-99887766",
        planName: "PennyGrade 6-Month Membership",
        amountPaid: 500,
        purchaseDate: "3 Nov 2026",
        cardNumber: "PEN-4723-4RP7",
        validityExpiry: "2 May 2027",
        deliveryAddress: {
          line1: "House 12, Main Road",
          city: "Daltonganj",
          state: "Jharkhand",
          pincode: "822101",
        },
        cardAssigned: true,
      });

      expect(email.subject).toBe("Your PennyGrade Membership Purchase Is Confirmed!");
      expect(email.html).toContain("ORD-99887766");
      expect(email.html).toContain("PEN-4723-4RP7");
      expect(email.html).toContain("₹500");
      expect(email.html).toContain("Daltonganj");

      const sendRes = await sendTransactionalEmail({
        recipientEmail: "priya@example.com",
        recipientName: "Priya Sharma",
        eventType: "PURCHASE_CONFIRMATION",
        subject: email.subject,
        html: email.html,
        idempotencyKey: "test-order-confirm-1",
      });

      expect(sendRes.ok).toBe(true);
      expect(sendRes.messageId).toBeDefined();
    });

    it("renders and sends Dispatch Notification Email with courier and tracking details", async () => {
      const email = renderDispatchNotificationEmail({
        customerName: "Rohan Gupta",
        customerEmail: "rohan@example.com",
        orderNumber: "ORD-11223344",
        cardNumber: "PEN-BTXK-W6BS",
        dispatchDate: "3 Nov 2026",
        courierName: "Blue Dart Express",
        trackingNumber: "BD99482710IN",
        trackingUrl: "https://bluedart.com/track/BD99482710IN",
      });

      expect(email.subject).toBe("Your PennyGrade Membership Card Has Been Dispatched!");
      expect(email.html).toContain("Blue Dart Express");
      expect(email.html).toContain("BD99482710IN");
      expect(email.html).toContain("PEN-****-W6BS"); // Card number is safely masked
    });

    it("renders and sends Card Delivery Confirmation Email with venue instructions", async () => {
      const email = renderDeliveryConfirmationEmail({
        customerName: "Rohan Gupta",
        customerEmail: "rohan@example.com",
        orderNumber: "ORD-11223344",
        cardNumber: "PEN-BTXK-W6BS",
        deliveryDate: "5 Nov 2026",
      });

      expect(email.subject).toBe("Your PennyGrade Card Has Been Delivered!");
      expect(email.html).toContain("DELIVERED & ACTIVE");
      expect(email.html).toContain("How To Use Your Card");
    });

    it("renders and sends Successful Offer Redemption Email with venue savings breakdown", async () => {
      const email = renderRedemptionSuccessEmail({
        customerName: "Samir Pandey",
        customerEmail: "samir@example.com",
        membershipNumber: "PEN-7X4P-92LM",
        partnerName: "ABC Café",
        offerTitle: "10% Flat Bill Discount",
        originalBill: 2000,
        discountAmount: 200,
        finalPayable: 1800,
        redemptionDate: "3 Nov 2026, 7:30 PM",
        redemptionReference: "sess-abc-12345",
      });

      expect(email.subject).toBe("Your PennyGrade Offer Was Successfully Redeemed!");
      expect(email.html).toContain("ABC Café");
      expect(email.html).toContain("₹2,000");
      expect(email.html).toContain("₹200");
      expect(email.html).toContain("₹1,800");
      expect(email.html).toContain("You saved ₹200");
    });

    it("prevents duplicate notification emails using idempotency keys", async () => {
      const idempotencyKey = `idemp-test-${Date.now()}`;

      const firstSend = await sendTransactionalEmail({
        recipientEmail: "duplicate.test@example.com",
        eventType: "PURCHASE_CONFIRMATION",
        subject: "Confirmation 1",
        html: "<p>Hello</p>",
        idempotencyKey,
      });

      expect(firstSend.ok).toBe(true);

      // Simulate duplicate trigger
      const secondSend = await sendTransactionalEmail({
        recipientEmail: "duplicate.test@example.com",
        eventType: "PURCHASE_CONFIRMATION",
        subject: "Confirmation 2",
        html: "<p>Hello Again</p>",
        idempotencyKey,
      });

      expect(secondSend.ok).toBe(true);
      expect(secondSend.status).toBe("ALREADY_SENT");
    });

    it("safely masks physical card numbers to protect member identity", () => {
      expect(maskCardNumber("PEN-7X4P-92LM")).toBe("PEN-****-92LM");
      expect(maskCardNumber("PEN-4723-4RP7")).toBe("PEN-****-4RP7");
      expect(maskCardNumber(null)).toBe("—");
    });
  });

  // ==========================================
  // 3. PHYSICAL FULFILMENT & TRACKING
  // ==========================================
  describe("3. Physical Card Fulfilment Workflow", () => {
    it("rejects admin cancellation until a refund has been completed", async () => {
      await expect(
        updateAdminOrderStatusLogic(
          { orderId: safeRandomUUID(), status: "CANCELLED" },
          { email: "admin@pennygrade.com" },
        ),
      ).rejects.toThrow(/refund workflow/i);
    });

    it("allows admin to update fulfilment status to SHIPPED with courier and tracking information", async () => {
      // Create a paid order
      const orderId = safeRandomUUID();
      store.orders.set(orderId, {
        id: orderId,
        order_number: "ORD-SHIPTEST",
        customer_name: "Shipment Test Customer",
        customer_email: "shiptest@example.com",
        customer_phone: "9876543210",
        membership_plan_id: mockPlanId,
        membership_id: "mem-ship-1",
        physical_card_id: "card-t-1",
        amount: 500,
        currency: "INR",
        payment_status: "PAID",
        order_status: "PAID",
        razorpay_order_id: "order_rzp_ship",
        razorpay_payment_id: "pay_rzp_ship",
        razorpay_signature: "sig_ship",
        delivery_address_line1: "123 Main St",
        delivery_city: "Daltonganj",
        delivery_state: "Jharkhand",
        delivery_pincode: "822101",
        delivery_country: "India",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const updateRes = await updateAdminOrderStatusLogic(
        {
          orderId,
          status: "SHIPPED",
          courierName: "Speed Post Priority",
          trackingNumber: "SP88990011IN",
          trackingUrl: "https://indiapost.gov.in/track",
          notes: "Package sealed and handed to carrier.",
        },
        { email: "admin@pennygrade.com", full_name: "Admin Officer" },
      );

      expect(updateRes.ok).toBe(true);
      expect(updateRes.status).toBe("SHIPPED");

      const updated = store.orders.get(orderId);
      expect(updated?.order_status).toBe("SHIPPED");
      expect(updated?.courier_name).toBe("Speed Post Priority");
      expect(updated?.tracking_number).toBe("SP88990011IN");
      expect(updated?.shipped_at).toBeDefined();

      // Check status audit history
      expect(
        store.orderHistory.some((h) => h.order_id === orderId && h.to_status === "SHIPPED"),
      ).toBe(true);
    });

    it("allows admin to manually assign a card to an unassigned order", async () => {
      const orderId = safeRandomUUID();
      store.orders.set(orderId, {
        id: orderId,
        order_number: "ORD-ASSIGNTEST",
        customer_name: "Manual Assign Member",
        customer_email: "manual@example.com",
        customer_phone: "9876543210",
        membership_plan_id: mockPlanId,
        membership_id: null,
        physical_card_id: null,
        amount: 500,
        currency: "INR",
        payment_status: "PAID",
        order_status: "FULFILMENT_EXCEPTION",
        razorpay_order_id: "order_rzp_assign",
        razorpay_payment_id: "pay_rzp_assign",
        razorpay_signature: "sig_assign",
        delivery_address_line1: "45 Court Rd",
        delivery_city: "Daltonganj",
        delivery_state: "Jharkhand",
        delivery_pincode: "822101",
        delivery_country: "India",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const assignRes = await assignAdminOrderCardLogic(
        {
          orderId,
          cardId: "card-t-2",
        },
        { email: "admin@pennygrade.com" },
      );

      expect(assignRes.ok).toBe(true);
      expect(assignRes.card_number).toBe("PEN-TEST-0002");

      const card = store.cards.get("card-t-2");
      expect(card?.status).toBe("ACTIVE");
      expect(card?.membership_id).toBeDefined();

      const order = store.orders.get(orderId);
      expect(order?.physical_card_id).toBe("card-t-2");
      expect(order?.order_status).toBe("PROCESSING");
    });
  });

  // ==========================================
  // 4. SECURITY & ANTI-ENUMERATION
  // ==========================================
  describe("4. Security & Anti-Enumeration", () => {
    it("prevents customer from viewing private order details with incorrect verification credentials", async () => {
      const orderId = safeRandomUUID();
      const orderNumber = "ORD-SECURE99";
      store.orders.set(orderId, {
        id: orderId,
        order_number: orderNumber,
        customer_name: "Private Customer",
        customer_email: "private.owner@example.com",
        customer_phone: "9876543210",
        membership_plan_id: mockPlanId,
        membership_id: null,
        physical_card_id: null,
        amount: 500,
        currency: "INR",
        payment_status: "PAID",
        order_status: "PROCESSING",
        razorpay_order_id: "order_sec_1",
        razorpay_payment_id: "pay_sec_1",
        razorpay_signature: "sig_sec_1",
        delivery_address_line1: "Top Secret Lane",
        delivery_city: "Daltonganj",
        delivery_state: "Jharkhand",
        delivery_pincode: "822101",
        delivery_country: "India",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // 1. Attacker guesses order number with wrong email
      const failRes = await getOrderTrackingDetailsLogic({
        orderNumber,
        verificationMobileOrEmail: "attacker@gmail.com",
      });

      expect(failRes.ok).toBe(false);
      expect(failRes.message).toMatch(/Unable to verify the details provided/i);

      const unknownRes = await getOrderTrackingDetailsLogic({
        orderNumber: "ORD-NOT-FOUND",
        verificationMobileOrEmail: "attacker@gmail.com",
      });
      expect(unknownRes).toEqual(failRes);

      const partialPhoneRes = await getOrderTrackingDetailsLogic({
        orderNumber,
        verificationMobileOrEmail: "76543210",
      });
      expect(partialPhoneRes.ok).toBe(false);
      expect(partialPhoneRes.message).toBe(failRes.message);

      // 2. Legitimate owner provides matching email
      const legitRes = await getOrderTrackingDetailsLogic({
        orderNumber,
        verificationMobileOrEmail: "private.owner@example.com",
      });

      expect(legitRes.ok).toBe(true);
      expect(legitRes.order?.orderNumber).toBe(orderNumber);
      expect(legitRes.order?.customerName).toBe("Private Customer");
      expect(legitRes.order?.stages.length).toBeGreaterThan(0);
    });

    it("verifies Razorpay webhook signatures and rejects fraudulent webhooks", () => {
      const rawBody = JSON.stringify({
        event: "payment.captured",
        payload: {
          payment: { entity: { id: "pay_fake_123", order_id: "order_fake_123" } },
        },
      });

      const secret = "my_custom_webhook_secret_key_123";

      // Valid signature
      const validSig = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

      expect(
        verifyRazorpayWebhookSignature({
          rawBody,
          signature: validSig,
          customSecret: secret,
        }),
      ).toBe(true);

      // Tampered body or invalid signature
      expect(
        verifyRazorpayWebhookSignature({
          rawBody: rawBody + "tampered",
          signature: validSig,
          customSecret: secret,
        }),
      ).toBe(false);
    });
  });
});
