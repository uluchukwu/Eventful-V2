import express from "express";
import prisma from "./prisma";
import authRoutes from "./routes/auth";
import { authenticate } from "./middleware/auth";
import eventRoutes from "./routes/events";
import paymentRoutes from "./routes/payment";

const app = express();
const PORT = 3000;

app.use(express.json());
app.use("/api/payments", paymentRoutes);
app.use("/api/auth", authRoutes);
app.use("/events", eventRoutes);

app.get("/", (req, res) => {
  res.send("Eventful is alive");
});

app.get("/users", authenticate, async (req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  res.json(users);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});