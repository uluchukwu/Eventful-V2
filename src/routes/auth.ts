import { Router } from "express";
import bcrypt from "bcrypt";
import prisma from "../prisma";

const router = Router();

router.post("/register", async (req, res) => {
  const { name, email, password, role } = req.body;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return res.status(400).json({ error: "Email already in use" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { name, email, password: hashedPassword, role },
  });

  res.status(201).json({ id: user.id, name: user.name, email: user.email });
});

export default router;