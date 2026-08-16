import { Router } from "express";
import prisma from "../prisma";
import { authenticate, requireRole } from "../middleware/auth";
import QRCode from "qrcode";
import crypto from "crypto";

const router = Router();

const PAYSTACK_SECRET_KEY: string = (() => {
  const value = process.env.PAYSTACK_SECRET_KEY;
  if (!value) throw new Error("PAYSTACK_SECRET_KEY is not set");
  return value;
})();

// Initialize payment for a ticket
router.post("/:ticketId/initialize", authenticate, async (req, res) => {
  const ticketId = req.params.ticketId as string;
  const userId = (req as any).user.userId;

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { event: true, user: true },
  });

  if (!ticket) return res.status(404).json({ error: "Ticket not found" });
  if (ticket.userId !== userId) return res.status(403).json({ error: "Not your ticket" });
  if (ticket.status !== "PENDING") return res.status(400).json({ error: "Ticket is not pending payment" });

  const email = ticket.user.email;
  const amountInKobo = Math.round(Number(ticket.event.price) * 100);

  const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      amount: amountInKobo,
      metadata: { ticketId },
    }),
  });

  const data = await paystackRes.json();

  if (!data.status) {
    return res.status(500).json({ error: "Failed to initialize payment", details: data.message });
  }

  await prisma.payment.create({
    data: {
      ticketId,
      amount: ticket.event.price,
      paystackRef: data.data.reference,
      status: "PENDING",
    },
  });

  res.json({ authorizationUrl: data.data.authorization_url, reference: data.data.reference });
});

// Verify payment and issue QR code
router.get("/verify/:reference", authenticate, async (req, res) => {
  const reference = req.params.reference as string;

  const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
  });

  const data = await paystackRes.json();

  if (!data.status || data.data.status !== "success") {
    await prisma.payment.updateMany({
      where: { paystackRef: reference },
      data: { status: "FAILED" },
    });
    return res.status(400).json({ error: "Payment verification failed" });
  }

  const payment = await prisma.payment.findUnique({ where: { paystackRef: reference } });
  if (!payment) return res.status(404).json({ error: "Payment record not found" });

  const qrToken = crypto.randomBytes(16).toString("hex");
  const qrCodeImage = await QRCode.toDataURL(qrToken);

  await prisma.$transaction([
    prisma.payment.update({
      where: { paystackRef: reference },
      data: { status: "SUCCESS", paidAt: new Date() },
    }),
    prisma.ticket.update({
      where: { id: payment.ticketId },
      data: { status: "CONFIRMED", qrCodeData: qrToken },
    }),
  ]);

  res.json({ message: "Payment verified successfully", qrCode: qrCodeImage });
});

// Scan a ticket's QR code at the event door — creators only
router.post("/scan/:qrToken", authenticate, requireRole("CREATOR"), async (req, res) => {
  const qrToken = req.params.qrToken as string;

  const ticket = await prisma.ticket.findUnique({ where: { qrCodeData: qrToken } });

  if (!ticket) return res.status(404).json({ error: "Invalid QR code" });
  if (ticket.status !== "CONFIRMED") {
    return res.status(400).json({ error: "Ticket not valid for entry" });
  }

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: { status: "SCANNED" },
  });

  res.json({ message: "Ticket valid — entry granted" });
});

export default router;