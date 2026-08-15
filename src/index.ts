import express from "express";
import prisma from "./prisma";

const app = express();
const PORT = 3000;

app.get("/", (req, res) => {
  res.send("Eventful is alive");
});

app.get("/users", async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});