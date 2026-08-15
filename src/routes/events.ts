import { Router } from "express";
import prisma from "../prisma";
import { authenticate, requireRole } from "../middleware/auth";

const router = Router();

// Create event — creators only
router.post("/", authenticate, requireRole("CREATOR"), async (req, res) => {
  const { title, description, location, date, price, totalTickets } = req.body;
  const creatorId = (req as any).user.userId;

  const event = await prisma.event.create({
    data: {
      title,
      description,
      location,
      date: new Date(date),
      price,
      totalTickets,
      creatorId,
    },
  });

  res.status(201).json(event);
});

// List all events — anyone
router.get("/", async (req, res) => {
  const events = await prisma.event.findMany();
  res.json(events);
});

// Get one event — anyone
router.get("/:id", async (req, res) => {
  const event = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!event) return res.status(404).json({ error: "Event not found" });
  res.json(event);
});

// Update event — only the creator who owns it
router.put("/:id", authenticate, requireRole("CREATOR"), async (req, res) => {
  const event = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!event) return res.status(404).json({ error: "Event not found" });

  const userId = (req as any).user.userId;
  if (event.creatorId !== userId) {
    return res.status(403).json({ error: "Not your event" });
  }

  const updated = await prisma.event.update({
    where: { id: req.params.id },
    data: req.body,
  });

  res.json(updated);
});

// Delete event — only the creator who owns it
router.delete("/:id", authenticate, requireRole("CREATOR"), async (req, res) => {
  const event = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!event) return res.status(404).json({ error: "Event not found" });

  const userId = (req as any).user.userId;
  if (event.creatorId !== userId) {
    return res.status(403).json({ error: "Not your event" });
  }

  await prisma.event.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;