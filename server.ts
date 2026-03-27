import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Travelpayouts API Management
  const TRAVELPAYOUTS_TOKEN = process.env.TRAVELPAYOUTS_TOKEN || "7060560c30b8425235744d3b7f599060";
  const TRAVELPAYOUTS_MARKER = process.env.TRAVELPAYOUTS_MARKER || "713985";

  // API Routes
  app.get("/api/flights/cities", async (req, res) => {
    const { keyword } = req.query;
    console.log(`Searching cities for: ${keyword}`);
    try {
      const response = await axios.get(
        `https://autocomplete.travelpayouts.com/places2?term=${keyword}&locale=es&types[]=city`
      );
      console.log(`Found ${response.data.length} cities`);
      res.json(response.data);
    } catch (error) {
      console.error("Error searching cities:", error);
      res.status(500).json({ error: "Failed to search cities" });
    }
  });

  app.get("/api/flights/search", async (req, res) => {
    let { originCode, destinationCode, date } = req.query;
    
    // Ensure codes are strings and trimmed
    const origin = String(originCode || "").trim().toUpperCase();
    const destination = String(destinationCode || "").trim().toUpperCase();

    console.log(`Searching flights: ${origin} -> ${destination} on ${date}`);
    
    if (origin.length < 2 || origin.length > 3 || destination.length < 2 || destination.length > 3) {
      return res.status(400).json({ error: "Los códigos IATA deben tener entre 2 y 3 caracteres." });
    }

    try {
      // Using v2/prices/latest for more consistent results
      const url = `https://api.travelpayouts.com/v2/prices/latest?origin=${origin}&destination=${destination}&beginning_of_period=${date}&currency=usd&token=${TRAVELPAYOUTS_TOKEN}&limit=10`;
      console.log(`Requesting URL: ${url.replace(TRAVELPAYOUTS_TOKEN, '***')}`);
      
      const response = await axios.get(url);
      
      console.log("API Response Status:", response.status);
      
      const flightOffers = response.data.data || [];
      
      console.log(`Found ${flightOffers.length} flight offers`);
      res.json(flightOffers);
    } catch (error: any) {
      console.error("Error searching flights:", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to search flights", details: error.response?.data });
    }
  });

  // Destination Search using Gemini
  app.post("/api/destinations/search", async (req, res) => {
    const { query } = req.body;
    console.log(`Searching destinations for: ${query}`);

    try {
      // We'll use the Gemini API directly from the server for this proxy
      // Note: In this environment, we should ideally use the frontend SDK, 
      // but for a "destination search" that returns structured data, 
      // a server-side route is cleaner for the frontend to consume.
      // However, the instructions say ALWAYS call Gemini from frontend.
      // So I will move the Gemini logic to the frontend Honeymoon.tsx.
      res.status(400).json({ error: "Use frontend Gemini SDK for destination search" });
    } catch (error) {
      res.status(500).json({ error: "Failed to search destinations" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
