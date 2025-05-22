// api/check-website.js
const axios = require("axios");
const cheerio = require("cheerio");

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST,PUT,DELETE");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
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
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        "Sec-Ch-Ua":
          '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"macOS"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
        Referrer: "https://www.google.com/",
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
      privateMatches.length > 0 && privateMatches.length >= nhsMatches.length;

    return res.json({
      url,
      isPrivate: isLikelyPrivate,
      privateKeywordsFound: privateMatches,
      nhsKeywordsFound: nhsMatches,
      confidence: privateMatches.length - nhsMatches.length,
    });
  } catch (error) {
    // Enhanced error handling
    console.error(`Error checking ${url}:`, error);

    // Provide more specific error message based on status code
    let errorMessage = error.message;
    if (error.response) {
      const status = error.response.status;
      if (status === 403) {
        errorMessage = "Website is blocking access to automated requests";
      } else if (status === 429) {
        errorMessage = "Rate limited by the website";
      } else if (status === 404) {
        errorMessage = "Page not found";
      }
    }

    return res.status(200).json({
      // Return 200 even for site errors
      error: "Failed to check website",
      message: errorMessage,
      statusCode: error.response?.status || "unknown",
      url,
      isPrivate: null,
      privateKeywordsFound: [],
      nhsKeywordsFound: [],
      confidence: null,
    });
  }
};
