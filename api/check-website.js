// api/check-website.js
const axios = require("axios");
const cheerio = require("cheerio");

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  // Handle preflight request
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "URL parameter is required" });
  }

  try {
    // Add a timeout to prevent long-running requests
    const response = await axios.get(url, {
      timeout: 5000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    const $ = cheerio.load(response.data);
    const bodyText = $("body").text().toLowerCase();

    // Check for various indicators of a private practice
    const privateKeywords = [
      "private",
      "fee",
      "fees",
      "price",
      "pricing",
      "subscription",
      "membership",
      "pay",
    ];

    const nhsKeywords = ["nhs", "national health service", "free healthcare"];

    const privateMatches = privateKeywords.filter((keyword) =>
      bodyText.includes(keyword)
    );

    const nhsMatches = nhsKeywords.filter((keyword) =>
      bodyText.includes(keyword)
    );

    // Determine if likely private based on keyword ratio
    const isLikelyPrivate =
      privateMatches.length > 0 && privateMatches.length > nhsMatches.length;

    return res.json({
      url,
      isPrivate: isLikelyPrivate,
      privateKeywordsFound: privateMatches,
      nhsKeywordsFound: nhsMatches,
      confidence: privateMatches.length - nhsMatches.length,
    });
  } catch (error) {
    console.error(`Error checking ${url}:`, error);
    return res.status(500).json({
      error: "Failed to check website",
      message: error.message,
      url,
    });
  }
};
