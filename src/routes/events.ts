// src/routes/events.ts
import { Router } from "express";
import type { Prisma } from "@prisma/client";
import prisma from "../prisma";
import { authenticate, requireRole } from "../middleware/auth";

const router = Router();

router.post("/", authenticate, requireRole("CREATOR"), async (req, res) => {
  const { title, description, location, date, price, totalTickets } = req.body;
  const creatorId = (req as any).user.userId;

  const event = await prisma.event.create({
    data: { title, description, location, date: new Date(date), price, totalTickets, creatorId },
  });

  res.status(201).json(event);
});

router.get("/", async (req, res) => {
  const events = await prisma.event.findMany();
  res.json(events);
});

router.get("/:id", async (req, res) => {
  const id = req.params.id as string;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) return res.status(404).json({ error: "Event not found" });
  res.json(event);
});

router.put("/:id", authenticate, requireRole("CREATOR"), async (req, res) => {
  const id = req.params.id as string;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) return res.status(404).json({ error: "Event not found" });

  const userId = (req as any).user.userId;
  if (event.creatorId !== userId) return res.status(403).json({ error: "Not your event" });

  const updated = await prisma.event.update({ where: { id }, data: req.body });
  res.json(updated);
});

router.delete("/:id", authenticate, requireRole("CREATOR"), async (req, res) => {
  const id = req.params.id as string;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) return res.status(404).json({ error: "Event not found" });

  const userId = (req as any).user.userId;
  if (event.creatorId !== userId) return res.status(403).json({ error: "Not your event" });

  await prisma.event.delete({ where: { id } });
  res.status(204).send();
});

router.post("/:eventId/tickets", authenticate, async (req, res) => {
  const eventId = req.params.eventId as string;
  const userId = (req as any).user.userId;

  try {
    const ticket = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const events = (await tx.$queryRaw`SELECT id, "totalTickets" FROM "Event" WHERE id = ${eventId} FOR UPDATE`) as
        { id: string; totalTickets: number }[];

      const event = events[0];
      if (!event) throw new Error("EVENT_NOT_FOUND");

      const soldCount = await tx.ticket.count({
        where: { eventId, status: { in: ["PENDING", "CONFIRMED"] } },
      });

      if (soldCount >= event.totalTickets) throw new Error("SOLD_OUT");

      return tx.ticket.create({ data: { userId, eventId, status: "PENDING" } });
    });

    res.status(201).json(ticket);
  } catch (err: any) {
    if (err.message === "SOLD_OUT") return res.status(409).json({ error: "Event is sold out" });
    if (err.message === "EVENT_NOT_FOUND") return res.status(404).json({ error: "Event not found" });
    res.status(500).json({ error: "Something went wrong" });
  }
});

export default router;