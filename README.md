# 👗 GRWM

### AI-Powered Personal Styling & Virtual Try-On

**GRWM** is an AI-powered shopping experience that analyzes your appearance using color theory, generates a personalized color palette, finds clothing that matches your colors, and lets you virtually try those clothes on in real time.

---

## ✨ How It Works

```text
📸 Face Scan
     ↓
🎨 AI Color Analysis
     ↓
🌈 Personalized Color Palette
     ↓
🛍️ Channel3 Agentic Search
     ↓
👕 Multi-Vendor Clothing Recommendations
     ↓
🥽 Decart Lucy 2.5
     ↓
✨ Real-Time Virtual Try-On
```

GRWM connects multiple AI technologies into one end-to-end experience:

1. **Face Scan** — The user provides a face scan.
2. **Color Analysis** — Our model analyzes visual features using color theory.
3. **Personalized Palette** — GRWM generates colors that complement the user.
4. **AI Shopping Search** — Channel3 searches across multiple vendors for clothing matching the recommended colors.
5. **Virtual Try-On** — Decart's Lucy 2.5 model lets users see the clothing on themselves in real time.

---

## 🧠 AI at the Core

| Technology                      | Purpose                                                                   |
| ------------------------------- | ------------------------------------------------------------------------- |
| 🎨 **Color Analysis Model**     | Analyzes the user's appearance and generates a personalized color palette |
| 🛍️ **Channel3 Agentic Search** | Dynamically searches clothing across multiple vendors                     |
| 🥽 **Decart Lucy 2.5**          | Powers real-time virtual try-on                                           |
| 🤖 **AI Integration**           | Connects the models and APIs into one personalized shopping workflow      |

---

## 🚀 Key Features

* 📸 Face-based color analysis
* 🎨 Personalized color palettes
* 🛍️ Multi-vendor clothing search
* 🤖 Agentic product discovery
* 💰 Product pricing and purchase links
* 🥽 Real-time virtual try-on
* ⚡ End-to-end AI-powered shopping experience

---

## 🏗️ Architecture

```text
                    ┌─────────────────┐
                    │    Face Scan    │
                    └────────┬────────┘
                             ↓
                    ┌─────────────────┐
                    │ Color Analysis  │
                    │      Model      │
                    └────────┬────────┘
                             ↓
                    ┌─────────────────┐
                    │ Personalized   │
                    │  Color Palette  │
                    └────────┬────────┘
                             ↓
                    ┌─────────────────┐
                    │    Channel3     │
                    │ Agentic Search  │
                    └────────┬────────┘
                             ↓
                    ┌─────────────────┐
                    │   Clothing      │
                    │ Recommendations │
                    └────────┬────────┘
                             ↓
                    ┌─────────────────┐
                    │ Decart Lucy 2.5 │
                    │ Virtual Try-On  │
                    └────────┬────────┘
                             ↓
                    ┌─────────────────┐
                    │  Final Outfit   │
                    │   Experience    │
                    └─────────────────┘
```

---

## 💡 Inspiration

We were inspired by how difficult it can be to turn a clothing idea in your head into an actual outfit.

You might see a color palette, an outfit on social media, or have a certain look in mind, but finding pieces that actually match can mean hours of scrolling through different websites. Even after finding something you like, you still don't really know how it will look on you until you buy it.

We wanted to make that process more intuitive — using AI to understand what works for you and AR to let you see it come to life before you commit.

---

## 🛠️ Tech Stack

**Frontend**

* JavaScript
* HTML / CSS

**Backend**

* Node.js
* REST APIs

**AI / ML**

* Color Analysis
* Computer Vision
* Channel3 Agentic Search
* Decart Lucy 2.5

**AR / XR**

* Real-Time Virtual Try-On

---

## 📁 Project Structure

```text
GRWM/
├── frontend/
│   ├── package.json
│   └── ...
│
├── backend-1/
│   ├── package.json
│   ├── index.js
│   └── ...
│
└── README.md
```

---

## ⚙️ Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/ishaanchip/str-qtstuff--hackgt.git
cd str-qtstuff--hackgt
```

### 2. Install frontend dependencies

```bash
cd frontend
npm install
```

### 3. Install backend dependencies

```bash
cd ../backend-1
npm install
```

### 4. Configure environment variables

Create a `.env` file in the backend directory:

```env
DECART_API_KEY=your_decart_api_key
CHANNEL3_API_KEY=your_channel3_api_key
```

### 5. Start the backend

**Windows PowerShell:**

```powershell
$env:NODE_ENV="development"
node index.js
```

### 6. Start the frontend

In a separate terminal:

```bash
cd frontend
npm run dev
```

---

## 🧩 Challenges We Faced

### Connecting Multiple AI Systems

GRWM combines several different technologies that each have their own APIs, data formats, and workflows. We had to build a reliable pipeline connecting our color analysis model, product search, and real-time virtual try-on.

### Real-Time AI

Virtual try-on requires processing visual information quickly enough to create an interactive experience. Integrating Decart's real-time model into the application introduced additional challenges around streaming and latency.

### Product Discovery

Finding products that actually match a user's personalized color palette is more complicated than simply searching for a color keyword. We used Channel3's agentic search capabilities to dynamically discover relevant products across multiple vendors.

---

## 🔮 Future Improvements

We're planning to make GRWM even more personalized and interactive.

* 👔 Generate complete outfits instead of individual items
* 💬 Let users describe the style or occasion they're looking for
* 🧠 Learn from user preferences over time
* 🌦️ Generate weather-aware outfits
* 💰 Add budget-based recommendations
* 🔄 Add mix-and-match functionality
* 🛍️ Expand the clothing catalog
* 🥽 Improve virtual try-on realism
* ❤️ Let users save favorite outfits
* 🔍 Add price comparison and alternative products

Our long-term goal is to make GRWM feel like an **AI stylist and virtual fitting room in your pocket.**

---

## 🏆 HackGT

Built for **HackGT**.

GRWM explores how AI, computer vision, agentic search, and immersive technology can work together to create a more personalized shopping experience.

---

## 👥 Team

Built with ❤️ at HackGT.
