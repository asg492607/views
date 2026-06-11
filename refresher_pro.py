"""
Auto-Refresher Pro - Controls your real Chrome browser
Requires: pip install selenium webdriver-manager
"""

import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox
import threading
import time
import random
import math
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager


# ─────────────────────────────────────────────
#  ALGORITHMS
# ─────────────────────────────────────────────

def algo_casual(min_s, max_s, state):
    """Bell-curve distribution + random distraction breaks."""
    r = (random.random() + random.random() + random.random()) / 3
    interval = int(r * (max_s - min_s + 1)) + min_s
    msg = "Normal interval"
    if random.random() < 0.15:
        extra = random.randint(30, 90)
        interval += extra
        msg = f"Distraction break (+{extra}s)"
    return interval, msg

def algo_aggressive(min_s, max_s, state):
    """Biased towards minimum — fast and consistent."""
    r = random.random() ** 2  # squaring biases towards 0
    interval = int(r * (max_s - min_s + 1)) + min_s
    return interval, "Aggressive: fast hit"

def algo_burst(min_s, max_s, state):
    """5 rapid bursts, then a long pause."""
    state['burst_count'] = state.get('burst_count', 0) + 1
    if state['burst_count'] >= 5:
        state['burst_count'] = 0
        interval = max_s + random.randint(60, 120)
        return interval, f"Burst done — long rest ({interval}s)"
    else:
        interval = min_s + random.randint(0, 3)
        return interval, f"Rapid burst {state['burst_count']}/5"

def algo_wave(min_s, max_s, state):
    """Smoothly oscillates from min to max and back."""
    progress = state.get('wave_progress', 0.0)
    direction = state.get('wave_dir', 1)
    progress += 0.1 * direction
    if progress >= 1.0:
        progress = 1.0
        direction = -1
    elif progress <= 0.0:
        progress = 0.0
        direction = 1
    state['wave_progress'] = progress
    state['wave_dir'] = direction
    # Ease in-out smoothing
    if progress < 0.5:
        eased = 2 * progress * progress
    else:
        eased = -1 + (4 - 2 * progress) * progress
    interval = min_s + int(eased * (max_s - min_s))
    label = "Wave ↑ slowing" if direction == 1 else "Wave ↓ speeding"
    return max(1, interval), label

def algo_random_spike(min_s, max_s, state):
    """Mostly normal, but 20% chance of a very fast spike."""
    if random.random() < 0.20:
        interval = max(1, min_s - random.randint(0, min_s // 2))
        return interval, "⚡ Random spike!"
    r = (random.random() + random.random()) / 2
    interval = int(r * (max_s - min_s + 1)) + min_s
    return interval, "Normal paced"

ALGORITHMS = {
    "Casual Human (Bell Curve)": algo_casual,
    "Aggressive (Fast & Consistent)": algo_aggressive,
    "Burst Mode (5 rapid + long rest)": algo_burst,
    "Wave Pattern (Oscillating)": algo_wave,
    "Random Spike (20% turbo boost)": algo_random_spike,
}


# ─────────────────────────────────────────────
#  CORE ENGINE
# ─────────────────────────────────────────────

class RefresherEngine:
    def __init__(self, url, algo_fn, min_s, max_s, log_fn, count_fn):
        self.url = url
        self.algo_fn = algo_fn
        self.min_s = min_s
        self.max_s = max_s
        self.log = log_fn
        self.update_count = count_fn
        self.running = False
        self.driver = None
        self.total = 0
        self.state = {}

    def start(self):
        self.running = True
        thread = threading.Thread(target=self._run, daemon=True)
        thread.start()

    def stop(self):
        self.running = False
        if self.driver:
            try:
                self.driver.quit()
            except Exception:
                pass
            self.driver = None

    def _run(self):
        self.log("🚀 Launching Chrome browser...")
        try:
            options = Options()
            options.add_argument("--start-maximized")
            options.add_experimental_option("excludeSwitches", ["enable-automation"])
            options.add_experimental_option("useAutomationExtension", False)

            service = Service(ChromeDriverManager().install())
            self.driver = webdriver.Chrome(service=service, options=options)

            self.log(f"✅ Chrome opened. Loading {self.url}")
            self.driver.get(self.url)
            self.total += 1
            self.update_count(self.total)

            while self.running:
                interval, reason = self.algo_fn(self.min_s, self.max_s, self.state)
                self.log(f"⏳ {reason} — waiting {interval}s...")

                # Countdown with live update
                for remaining in range(interval, 0, -1):
                    if not self.running:
                        break
                    self.log(f"⏳ {reason} — refreshing in {remaining}s  (Total: {self.total})")
                    time.sleep(1)

                if not self.running:
                    break

                self.log("🔄 Refreshing page now...")
                try:
                    self.driver.refresh()
                    self.total += 1
                    self.update_count(self.total)
                    self.log(f"✅ Refreshed! Total: {self.total}")
                except Exception as e:
                    self.log(f"❌ Refresh failed: {e}")
                    break

        except Exception as e:
            self.log(f"❌ Error: {e}")
        finally:
            self.log("🛑 Engine stopped.")


# ─────────────────────────────────────────────
#  GUI
# ─────────────────────────────────────────────

class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Auto-Refresher Pro 🚀")
        self.geometry("680x700")
        self.configure(bg="#0f172a")
        self.resizable(False, False)

        self.engine = None
        self._build_ui()

    def _label(self, parent, text, size=11, bold=False, color="#94a3b8"):
        font = ("Segoe UI", size, "bold" if bold else "normal")
        return tk.Label(parent, text=text, bg="#0f172a", fg=color,
                        font=font, anchor="w")

    def _build_ui(self):
        # ── Title ──
        title_frame = tk.Frame(self, bg="#0f172a")
        title_frame.pack(pady=(24, 4))
        tk.Label(title_frame, text="Auto-Refresher", bg="#0f172a",
                 fg="#818cf8", font=("Segoe UI", 22, "bold")).pack(side="left")
        tk.Label(title_frame, text=" PRO", bg="#0f172a",
                 fg="#10b981", font=("Segoe UI", 14, "bold")).pack(side="left", padx=(4, 0), pady=6)

        tk.Label(self, text="Controls your real Chrome browser with advanced algorithms",
                 bg="#0f172a", fg="#64748b", font=("Segoe UI", 10)).pack()

        # ── Card frame ──
        card = tk.Frame(self, bg="#1e293b", bd=0, relief="flat")
        card.pack(padx=28, pady=20, fill="x")
        inner = tk.Frame(card, bg="#1e293b")
        inner.pack(padx=20, pady=20, fill="x")

        # URL
        self._label(inner, "Target URL", bold=True, color="#f8fafc").pack(anchor="w")
        self.url_var = tk.StringVar()
        url_entry = tk.Entry(inner, textvariable=self.url_var, font=("Segoe UI", 11),
                             bg="#0f172a", fg="#f8fafc", insertbackground="white",
                             relief="flat", bd=0)
        url_entry.pack(fill="x", pady=(4, 14), ipady=8, padx=2)
        url_entry.insert(0, "https://")

        # Algorithm
        self._label(inner, "Algorithm", bold=True, color="#f8fafc").pack(anchor="w")
        self.algo_var = tk.StringVar(value=list(ALGORITHMS.keys())[0])
        algo_menu = ttk.Combobox(inner, textvariable=self.algo_var,
                                 values=list(ALGORITHMS.keys()),
                                 state="readonly", font=("Segoe UI", 10))
        algo_menu.pack(fill="x", pady=(4, 14))

        # Intervals
        row = tk.Frame(inner, bg="#1e293b")
        row.pack(fill="x", pady=(0, 14))
        left = tk.Frame(row, bg="#1e293b")
        left.pack(side="left", fill="x", expand=True, padx=(0, 8))
        right = tk.Frame(row, bg="#1e293b")
        right.pack(side="left", fill="x", expand=True)

        self._label(left, "Min Interval (sec)", bold=True, color="#f8fafc").pack(anchor="w")
        self.min_var = tk.IntVar(value=10)
        tk.Spinbox(left, from_=1, to=3600, textvariable=self.min_var,
                   font=("Segoe UI", 11), bg="#0f172a", fg="#f8fafc",
                   buttonbackground="#1e293b", relief="flat").pack(fill="x", pady=(4, 0), ipady=6)

        self._label(right, "Max Interval (sec)", bold=True, color="#f8fafc").pack(anchor="w")
        self.max_var = tk.IntVar(value=50)
        tk.Spinbox(right, from_=1, to=3600, textvariable=self.max_var,
                   font=("Segoe UI", 11), bg="#0f172a", fg="#f8fafc",
                   buttonbackground="#1e293b", relief="flat").pack(fill="x", pady=(4, 0), ipady=6)

        # Buttons
        btn_row = tk.Frame(inner, bg="#1e293b")
        btn_row.pack(fill="x", pady=(4, 0))

        self.start_btn = tk.Button(btn_row, text="▶  Start Refreshing",
                                   bg="#6366f1", fg="white",
                                   font=("Segoe UI", 11, "bold"),
                                   relief="flat", cursor="hand2",
                                   activebackground="#4f46e5",
                                   command=self.start_engine)
        self.start_btn.pack(side="left", fill="x", expand=True, ipady=10, padx=(0, 8))

        self.stop_btn = tk.Button(btn_row, text="■  Stop",
                                  bg="#ef4444", fg="white",
                                  font=("Segoe UI", 11, "bold"),
                                  relief="flat", cursor="hand2",
                                  state="disabled",
                                  activebackground="#dc2626",
                                  command=self.stop_engine)
        self.stop_btn.pack(side="left", fill="x", expand=True, ipady=10)

        # ── Stats bar ──
        stats = tk.Frame(self, bg="#1e293b")
        stats.pack(padx=28, fill="x")
        self.count_var = tk.StringVar(value="Total Refreshes: 0")
        tk.Label(stats, textvariable=self.count_var, bg="#1e293b",
                 fg="#22c55e", font=("Segoe UI", 11, "bold"),
                 padx=16, pady=8).pack(side="left")

        # ── Log Box ──
        log_frame = tk.Frame(self, bg="#0f172a")
        log_frame.pack(padx=28, pady=(14, 24), fill="both", expand=True)
        self._label(log_frame, "Activity Log", bold=True, color="#f8fafc").pack(anchor="w")
        self.log_box = scrolledtext.ScrolledText(log_frame, height=14,
                                                  bg="#0a0f1e", fg="#a5b4fc",
                                                  font=("Consolas", 10),
                                                  relief="flat", bd=0,
                                                  insertbackground="white")
        self.log_box.pack(fill="both", expand=True, pady=(6, 0))
        self.log_box.configure(state="disabled")

        # Style the combobox
        style = ttk.Style()
        style.theme_use("clam")
        style.configure("TCombobox",
                        fieldbackground="#0f172a",
                        background="#0f172a",
                        foreground="#f8fafc",
                        selectbackground="#6366f1",
                        arrowcolor="#94a3b8")

    def log(self, message):
        ts = datetime.now().strftime("%H:%M:%S")
        def _write():
            self.log_box.configure(state="normal")
            self.log_box.insert("end", f"[{ts}] {message}\n")
            self.log_box.see("end")
            self.log_box.configure(state="disabled")
        self.after(0, _write)

    def update_count(self, count):
        self.after(0, lambda: self.count_var.set(f"Total Refreshes: {count}"))

    def start_engine(self):
        url = self.url_var.get().strip()
        if not url or url == "https://":
            messagebox.showerror("Error", "Please enter a valid URL.")
            return
        if not url.startswith("http"):
            url = "https://" + url

        min_s = self.min_var.get()
        max_s = self.max_var.get()
        if min_s > max_s:
            messagebox.showerror("Error", "Min interval must be ≤ Max interval.")
            return

        algo_name = self.algo_var.get()
        algo_fn = ALGORITHMS[algo_name]

        self.start_btn.config(state="disabled")
        self.stop_btn.config(state="normal")

        self.log(f"Algorithm: {algo_name}")
        self.log(f"Interval: {min_s}s — {max_s}s")
        self.log(f"URL: {url}")

        self.engine = RefresherEngine(url, algo_fn, min_s, max_s,
                                       self.log, self.update_count)
        self.engine.start()

    def stop_engine(self):
        if self.engine:
            self.engine.stop()
            self.engine = None
        self.start_btn.config(state="normal")
        self.stop_btn.config(state="disabled")
        self.log("🛑 Stopped by user.")

    def on_close(self):
        if self.engine:
            self.engine.stop()
        self.destroy()


if __name__ == "__main__":
    app = App()
    app.protocol("WM_DELETE_WINDOW", app.on_close)
    app.mainloop()
