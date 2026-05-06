import cookieParser from "cookie-parser";
import express from "express";
import authRoutes from "./routes/auth";
import protectedRoutes from "./routes/protected";

export const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRoutes);
app.use("/protected", protectedRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: "Not found." });
});
