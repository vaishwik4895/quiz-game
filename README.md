# quiz-game
# ⚡ QuizBlast — Interactive Quiz Web App

QuizBlast is a modern, responsive web-based quiz game designed to test knowledge across multiple categories with an engaging UI and real-time feedback system.

---

## 🚀 Features

* 🎯 **Multiple Difficulty Levels**

  * Easy, Medium, Hard (with different timers and scoring systems)

* ⏱ **Real-Time Timer**

  * Countdown-based answering system with visual progress ring

* 🧠 **Dynamic Question System**

  * Questions loaded from a JSON file
  * Covers categories like Geography, Science, Maths, History, etc.

* 🏆 **Scoring & Streak System**

  * Points based on correctness and speed
  * Streak tracking for consecutive correct answers

* 🧩 **Lifelines**

  * 50/50 (removes two wrong options)
  * Skip (skip question without penalty)
  * Extra Time (+8 seconds)

* 📊 **Results & Analytics**

  * Score summary
  * Accuracy percentage
  * Answer review

* 🥇 **Leaderboard**

  * Stores top scores using browser local storage

* 🎨 **Modern UI/UX**

  * Animated gradients, blobs, and transitions
  * Fully responsive design

---

## 📁 Project Structure

```
QuizBlast/
│── index.html      # Main UI structure
│── style.css       # Styling and animations
│── script.js       # Game logic and interactions
│── questions.json  # Question bank
```

---

## ⚙️ How It Works

### 1. Frontend Structure

* The main interface is built using semantic HTML
* Includes three main screens:

  * Home
  * Quiz
  * Results


### 2. Game Logic

* Written in vanilla JavaScript
* Handles:

  * Question rendering
  * Timer logic
  * Score calculation
  * Lifelines
  * Local storage persistence


### 3. Question System

* Questions are stored in a structured JSON format
* Organized by difficulty levels:

  * easy
  * medium
  * hard


### 4. Styling

* Uses custom CSS variables for theming
* Includes animations, gradients, and responsive layouts


---

## 🧮 Scoring System

* Each difficulty has:

  * Base points
  * Time-based bonus

Example:

* Easy → 10 pts + bonus
* Medium → 20 pts + bonus
* Hard → 30 pts + bonus

Bonus depends on how quickly the user answers.

---

## 💾 Data Storage

* Uses **Local Storage** to store:

  * Leaderboard
  * Best scores
  * Game history

---

## ▶️ How to Run

1. Download or clone the repository:

   ```
   git clone https://github.com/your-username/quizblast.git
   ```

2. Open `index.html` in any modern browser

> No backend or installation required — runs entirely in the browser.

---

## 🛠 Technologies Used

* HTML5
* CSS3 (Animations, Flexbox, Grid)
* JavaScript (ES6)
* JSON (Data handling)

---

## 📌 Future Improvements

* Add user authentication
* Add more question categories
* Online multiplayer mode
* Backend leaderboard system
* API-based question fetching

---

## 👨‍💻 Author

Developed as part of a web development project assignment.

---

## 📄 License

This project is for educational purposes.

---
