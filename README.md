# Auto-Refresher Manager 🚀

A full-stack, educational web application designed to automatically refresh URLs and embedded YouTube videos using smart, randomized algorithms.

![App Preview](https://via.placeholder.com/800x400.png?text=Auto-Refresher+Pro)

## ⚠️ Important Educational Notice

**This tool will NOT increase real YouTube views.** 
YouTube has highly advanced view-validation systems that filter out automated traffic. Refreshing an embedded video (even with randomized algorithms) does not count as a legitimate view because:
1. It lacks genuine watch time.
2. The requests originate from the same IP address.
3. YouTube heavily scrutinizes and filters views generated from embeds without genuine user interaction.

This project was built strictly for **educational purposes** to demonstrate full-stack development, API integration, and algorithm design.

## ✨ Features

* **Smart URL Parsing:** Automatically detects normal URLs, YouTube Video Links, YouTube Shorts, and YouTube Playlists, converting them into valid embed links.
* **5 Smart Refresh Algorithms:**
  * 🧠 **Casual Human (Bell Curve):** Clusters intervals naturally with occasional "coffee breaks".
  * ⚡ **Aggressive:** Consistently fast refreshes biased toward your minimum interval.
  * 💥 **Burst Mode:** 5 rapid refreshes followed by a long resting pause.
  * 🌊 **Wave Pattern:** Smoothly oscillates between speeding up and slowing down.
  * 🚀 **Random Spike:** Normal pacing with a 20% chance of a massive speed boost.
* **Full-Stack Architecture:** Node.js/Express backend with a REST API to save and load configuration presets.
* **Premium UI:** A sleek, responsive dark-mode interface with glassmorphism, live stat chips, and URL badges.
* **Desktop App Included:** Comes with `refresher_pro.py`, a Tkinter + Selenium Python application that controls a real Chrome browser.

## 🛠️ Tech Stack

* **Frontend:** Vanilla HTML5, CSS3, JavaScript
* **Backend:** Node.js, Express.js
* **Database:** Local JSON file (`data/db.json`)
* **Deployment:** Pre-configured for Render (`render.yaml`)

## 🚀 Getting Started Locally

### Web App (Node.js)
1. Ensure you have [Node.js](https://nodejs.org/) installed.
2. Clone this repository.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the server:
   ```bash
   npm start
   ```
5. Open your browser and navigate to `http://localhost:3000`.

### Desktop App (Python + Selenium)
If you prefer the standalone desktop version that controls your real Chrome browser:
1. Ensure you have [Python](https://python.org/) installed.
2. Install dependencies:
   ```bash
   pip install selenium webdriver-manager
   ```
3. Run the application:
   ```bash
   python refresher_pro.py
   ```

## ☁️ Deploying to Render

This repository includes a `render.yaml` file, making deployment a 1-click process.

1. Create an account on [Render](https://render.com/).
2. Create a new **Web Service**.
3. Connect your GitHub account and select this repository.
4. Render will automatically detect the configuration and deploy the application.
