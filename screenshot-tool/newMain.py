import tkinter as tk
from tkinter import filedialog, ttk, messagebox

from tkinter import font as tkFont
from PIL import ImageGrab, Image, ImageTk, ImageDraw, ImageOps
import base64
import io
import requests
import ctypes
import win32clipboard
import pystray
from pystray import MenuItem as item
import keyboard
import threading
import logging
import traceback
import os
import sys

# Constants for the DPI Awareness context
PROCESS_PER_MONITOR_DPI_AWARE = 2

# Set DPI Awareness (Windows 10 and 8)
ctypes.windll.shcore.SetProcessDpiAwareness(PROCESS_PER_MONITOR_DPI_AWARE)

product_key = ""

class ScreenshotApp:
    def __init__(self):
        self.root = tk.Tk()
        self.root.withdraw()  # Hide the main window initially
        self.screenshot = None
        self.rect = None
        self.start_x = 0.0
        self.start_y = 0.0
        self.cur_x = 0.0
        self.cur_y = 0.0
        self.button_font = tkFont.Font(family="Helvetica", size=12, weight="bold")
        self.transparent_window = None
        self.button_window = None
        self.ai_called = False
        self.drawing = False
        self.highlight_rects = []

    def start(self):
        self.root.deiconify()  # Show the main window
        self.root.attributes('-fullscreen', True)  # Make window full screen
        self.root.attributes('-alpha', 0.3)  # Make the window transparent
        self.root.attributes('-topmost', True)  # Keep the window always on top
        self.canvas = tk.Canvas(self.root, cursor="cross", bg="grey50", highlightthickness=0)
        self.canvas.pack(fill=tk.BOTH, expand=True)
        self.canvas.bind("<ButtonPress-1>", self.on_button_press)
        self.canvas.bind("<B1-Motion>", self.on_move_press)
        self.canvas.bind("<ButtonRelease-1>", self.on_button_release)
        self.root.bind('<Escape>', self.close_program)

        # Create a new Toplevel window for the tutorial
        self.tutorial_window = tk.Toplevel(self.root)
        self.tutorial_window.overrideredirect(True)
        self.tutorial_window.attributes('-topmost', True)

        # Create a style for the tutorial frame
        style = ttk.Style()
        style.configure("Tutorial.TFrame", background="blue", relief="raised", cornerRadius=15)

        # Create a frame for the tutorial on top of the tutorial window
        self.tutorial_frame = ttk.Frame(self.tutorial_window, style="Tutorial.TFrame")
        self.tutorial_frame.pack(fill=tk.BOTH, expand=True)

        # Create a label for the tutorial text
        self.tutorial_text = tk.Label(self.tutorial_frame, text="DEVELOPMENT BUILD 0.3.0\n\n Ensure Excel is open with the corresponding add-in before using the 'Send' button.\n\n Click outside of the drawn box to close.\n\n Highlighter tool is experimental.", wraplength=200, bg="blue", fg="white")
        self.tutorial_text.place(relx=0.5, rely=0.5, anchor=tk.CENTER)

        # Position the tutorial window
        screen_width = self.root.winfo_screenwidth()
        screen_height = self.root.winfo_screenheight()
        rect_width = 250  # Adjust as needed
        rect_height = 200  # Adjust as needed
        rect_x1 = (screen_width - rect_width) / 2
        rect_y1 = (screen_height - rect_height) / 2
        self.tutorial_window.geometry(f'{rect_width}x{rect_height}+{int(rect_x1)}+{int(rect_y1)}')

        self.root.mainloop()

    def on_button_press(self, event):
        self.start_x = self.canvas.canvasx(event.x)
        self.start_y = self.canvas.canvasy(event.y)
        self.cur_x = self.start_x
        self.cur_y = self.start_y
        if not self.rect:
            # Create a background rectangle with a contrasting color
            self.bg_rect = self.canvas.create_rectangle(self.start_x, self.start_y, self.start_x, self.start_y, outline='black', width=5)
            
            # Create the main outline rectangle
            self.rect = self.canvas.create_rectangle(self.start_x, self.start_y, self.start_x, self.start_y, outline='white', width=3)
            
            # Raise the main outline rectangle above the background rectangle
            self.canvas.tag_raise(self.rect)
            
            # Delete the tutorial rectangle and text
            self.tutorial_window.destroy()

    def on_move_press(self, event):
        self.cur_x, self.cur_y = (event.x, event.y)
        if self.drawing:
            self.canvas.coords(self.current_highlight_rect, self.start_x, self.start_y, self.cur_x, self.cur_y)
        else:
            self.canvas.coords(self.bg_rect, self.start_x, self.start_y, self.cur_x, self.cur_y)
            self.canvas.coords(self.rect, self.start_x, self.start_y, self.cur_x, self.cur_y)

    def on_button_release(self, event):
        if self.start_x == self.cur_x and self.start_y == self.cur_y:
            self.close_program()
            return

        if self.drawing:
            self.highlight_rects.append(self.current_highlight_rect)
            self.drawing = False
            return

        # Determine the top-left and bottom-right coordinates
        left = min(self.start_x, self.cur_x)
        top = min(self.start_y, self.cur_y)
        right = max(self.start_x, self.cur_x)
        bottom = max(self.start_y, self.cur_y)

        # Capture only the selected area directly
        self.screenshot = ImageGrab.grab(bbox=(left, top, right, bottom))

        self.canvas.unbind("<ButtonPress-1>")
        self.canvas.unbind("<B1-Motion>")
        self.canvas.unbind("<ButtonRelease-1>")

        self.canvas.bind("<Button-1>", self.on_canvas_click)

        # Create a new Toplevel window for the buttons above all other layers
        self.button_window = tk.Toplevel(self.root)
        self.button_window.overrideredirect(True)
        self.button_window.attributes('-topmost', True)

        # Remove the dim layer and rectangle from the canvas
        self.canvas.delete(self.rect)

        # Store the original screenshot boundaries
        self.screenshot_left = min(self.start_x, self.cur_x)
        self.screenshot_top = min(self.start_y, self.cur_y)
        self.screenshot_right = max(self.start_x, self.cur_x)
        self.screenshot_bottom = max(self.start_y, self.cur_y)

        # Create a new screenshot of the selected area without the dim layer and display it on the canvas
        self.screenshot_without_dim = ImageTk.PhotoImage(self.screenshot)
        self.canvas.create_image(left, top, image=self.screenshot_without_dim, anchor='nw')

        self.configure_transparent_layers()
        self.create_buttons()

    def create_buttons(self):
        # Determine the correct path to the icons
        base_path = os.path.join(sys._MEIPASS, 'button_icons') if hasattr(sys, '_MEIPASS') else 'button_icons'

        # Load and resize the images
        upload_image_path = os.path.join(base_path, 'send_2.png')
        save_image_path = os.path.join(base_path, 'save_2.png')
        copy_image_path = os.path.join(base_path, 'copy_2.png')
        highlight_image_path = os.path.join(base_path, 'highlight.png')

        upload_image = Image.open(upload_image_path).resize((30, 30), Image.Resampling.LANCZOS)
        upload_icon = ImageTk.PhotoImage(upload_image)

        save_image = Image.open(save_image_path).resize((30, 30), Image.Resampling.LANCZOS)
        save_icon = ImageTk.PhotoImage(save_image)

        copy_image = Image.open(copy_image_path).resize((30, 30), Image.Resampling.LANCZOS)
        copy_icon = ImageTk.PhotoImage(copy_image)

        highlight_image = Image.open(highlight_image_path).resize((30, 30), Image.Resampling.LANCZOS)
        highlight_icon = ImageTk.PhotoImage(highlight_image)

        # Create a frame to hold the buttons
        button_frame = tk.Frame(self.button_window)
        button_frame.pack(side=tk.BOTTOM, fill=tk.X)

        # Create Save, Copy, Highlight, and Call AI buttons
        self.save_button = ttk.Button(button_frame, image=save_icon, command=self.save_screenshot)
        self.save_button.image = save_icon
        self.save_button.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        self.copy_button = ttk.Button(button_frame, image=copy_icon, command=self.copy_screenshot)
        self.copy_button.image = copy_icon
        self.copy_button.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        self.highlight_button = ttk.Button(button_frame, image=highlight_icon, command=self.enable_drawing_mode)
        self.highlight_button.image = highlight_icon
        self.highlight_button.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        self.call_ai_button = ttk.Button(button_frame, image=upload_icon, command=self.call_ai)
        self.call_ai_button.image = upload_icon
        self.call_ai_button.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        # Adjust the window size and position after packing buttons
        self.button_window.update_idletasks()
        button_width = self.save_button.winfo_reqwidth() + self.copy_button.winfo_reqwidth() + self.highlight_button.winfo_reqwidth() + self.call_ai_button.winfo_reqwidth()
        button_height = self.save_button.winfo_reqheight()
        self.button_window.geometry(f"{button_width}x{button_height}")

        # Calculate the bottom-right corner of the screenshot
        right = max(self.start_x, self.cur_x)
        bottom = max(self.start_y, self.cur_y)

        # Check if the screenshot goes all the way to the bottom of the screen
        screen_height = self.root.winfo_screenheight()
        if bottom >= screen_height:
            # Place the buttons above the bottom border of the screenshot
            button_y = bottom - button_height - 10
        else:
            # Place the buttons below the bottom border of the screenshot
            button_y = bottom + 10

        # Set the button window position with the right edge aligned to the right border of the screenshot
        self.button_window.geometry(f"{button_width}x{button_height}+{int(right - button_width)}+{int(button_y)}")

        self.button_window.lift()
        self.button_window.focus_force()


    def enable_drawing_mode(self):
        self.drawing = True
        self.canvas.bind("<ButtonPress-1>", self.start_draw)
        self.canvas.bind("<B1-Motion>", self.draw)
        self.canvas.bind("<ButtonRelease-1>", self.end_draw)
        self.canvas.config(cursor="pencil")

    def start_draw(self, event):
        x = max(min(event.x, self.screenshot_right), self.screenshot_left)
        y = max(min(event.y, self.screenshot_bottom), self.screenshot_top)
        self.start_x = x
        self.start_y = y
        self.current_highlight = self.canvas.create_line(
            x, y, x, y,
            fill='yellow', width=20, capstyle=tk.ROUND, joinstyle=tk.ROUND,
            stipple='gray50'
        )

    def draw(self, event):
        x = max(min(event.x, self.screenshot_right), self.screenshot_left)
        y = max(min(event.y, self.screenshot_bottom), self.screenshot_top)
        self.canvas.coords(self.current_highlight, self.start_x, self.start_y, x, y)

    def end_draw(self, event):
        self.highlight_rects.append(self.current_highlight)
        self.drawing = False
        self.canvas.unbind("<ButtonPress-1>")
        self.canvas.unbind("<B1-Motion>")
        self.canvas.unbind("<ButtonRelease-1>")
        self.canvas.bind("<Button-1>", self.on_canvas_click)
        self.highlight_button.state(['!pressed'])
        self.canvas.config(cursor="")
        self.button_window.lift()
        self.button_window.focus_force()

    def copy_screenshot(self):
        canvas_image = self.capture_canvas()
        output = io.BytesIO()
        canvas_image.save(output, format='BMP')
        data = output.getvalue()[14:]  # Remove the BMP header
        output.close()

        win32clipboard.OpenClipboard()
        win32clipboard.EmptyClipboard()
        win32clipboard.SetClipboardData(win32clipboard.CF_DIB, data)
        win32clipboard.CloseClipboard()
        print("Screenshot copied to clipboard.")
        self.close_program()

    def on_canvas_click(self, event):
        # Check if the click is outside of the screenshot area
        if not (self.start_x <= event.x <= self.cur_x and self.start_y <= event.y <= self.cur_y):
            # If the click is outside of the screenshot area, close the program
            self.close_program()

    def capture_canvas(self):
        # Use the stored original screenshot boundaries
        left = self.screenshot_left
        top = self.screenshot_top
        right = self.screenshot_right
        bottom = self.screenshot_bottom

        # Convert the canvas coordinates to screen coordinates
        canvas_x = self.canvas.winfo_rootx() + left
        canvas_y = self.canvas.winfo_rooty() + top
        canvas_width = right - left
        canvas_height = bottom - top

        # Capture the specific region of the canvas using ImageGrab
        canvas_image = ImageGrab.grab(bbox=(canvas_x, canvas_y, canvas_x + canvas_width, canvas_y + canvas_height))

        # Convert the image to RGBA
        canvas_image = canvas_image.convert("RGBA")

        # Create a new transparent layer for highlights
        highlight_layer = Image.new('RGBA', canvas_image.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(highlight_layer)

        # Draw the highlight lines onto the transparent layer
        for highlight in self.highlight_rects:
            x0, y0, x1, y1 = self.canvas.coords(highlight)
            x0 = max(0, min(x0 - left, canvas_width))
            y0 = max(0, min(y0 - top, canvas_height))
            x1 = max(0, min(x1 - left, canvas_width))
            y1 = max(0, min(y1 - top, canvas_height))
            draw.line((x0, y0, x1, y1), fill=(255, 255, 0, 128), width=20)

        # Composite the highlight layer onto the original image
        canvas_image = Image.alpha_composite(canvas_image, highlight_layer)

        return canvas_image


    def configure_transparent_layers(self):
        if self.start_x == self.cur_x and self.start_y == self.cur_y:
            self.close_program()
            return

        screen_width = self.root.winfo_screenwidth()
        screen_height = self.root.winfo_screenheight()

        self.transparent_window1 = self.create_transparent_window(0, 0, screen_width, min(self.start_y, self.cur_y))
        self.transparent_window2 = self.create_transparent_window(0, max(self.start_y, self.cur_y), screen_width, screen_height)
        self.transparent_window3 = self.create_transparent_window(0, min(self.start_y, self.cur_y), min(self.start_x, self.cur_x), max(self.start_y, self.cur_y))
        self.transparent_window4 = self.create_transparent_window(max(self.start_x, self.cur_x), min(self.start_y, self.cur_y), screen_width, max(self.start_y, self.cur_y))

    def call_ai(self):
        if self.ai_called:
            return
        self.ai_called = True

        self.button_window.config(cursor="watch")
        self.button_window.update()
        print("Sending screenshot...")

        # Convert the canvas image to Base64
        canvas_image = self.capture_canvas()
        buffered = io.BytesIO()
        canvas_image.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode()

        try:
            # Send the screenshot via HTTP POST request with the product key as a third parameter
            response = requests.post('https://api.quickdata.ai/new_picture', json={'imageType': 'image/png', 'imageUrl': img_str, 'productKey': product_key}, timeout=5)
            print("Screenshot sent via HTTP POST")
            print(f"Product Key Sent: {product_key}")  # Confirm the correct product key was sent
        except requests.Timeout:
            print("The request timed out.")
        except requests.RequestException as e:
            print(f"An error occurred: {e}")

        self.button_window.config(cursor="")
        self.button_window.update()

        self.close_program()

        

    def create_transparent_window(self, x1, y1, x2, y2):
        width = abs(x2 - x1)
        height = abs(y2 - y1)
        top_left_x = min(x1, x2)
        top_left_y = min(y1, y2)

        window = tk.Toplevel(self.root)
        window.overrideredirect(True)
        window.attributes('-alpha', 0.3)
        window.geometry(f"{int(width)}x{int(height)}+{int(top_left_x)}+{int(top_left_y)}")
        return window

    def save_screenshot(self):
        file_path = filedialog.asksaveasfilename(defaultextension='.png', filetypes=[("PNG files", "*.png"), ("All files", "*.*")])
        if file_path:
            canvas_image = self.capture_canvas()
            canvas_image.save(file_path)
            self.close_program()


    def close_program(self, event=None):
        if self.transparent_window:
            self.transparent_window.destroy()
        self.root.destroy()


def launch_app(icon, item):
    app = ScreenshotApp()
    app.start()

def exit_action(icon, item):
    print("Exiting...")
    icon.stop()

def open_keyboard_settings(icon, item):
    def show_message_box():
        messagebox.showinfo("Instructions", "Please navigate to 'Use the Print screen key to open screen capture' and turn it off. \n\nThis tool will then be bound to your print screen key whenever it is open.")
        root.destroy()

    root = tk.Tk()
    root.withdraw()
    root.after(0, show_message_box)
    root.mainloop()
    os.system("start ms-settings:easeofaccess-keyboard")

def enter_product_key(icon, item):
    global product_key

    def submit_key():
        nonlocal key_entry, key_window
        product_key = key_entry.get()
        print(f"Product Key Entered: {product_key}")
        key_window.destroy()

        # Save the product key to a file in the user's home directory
        home_dir = os.path.expanduser('~')
        config_dir = os.path.join(home_dir, '.screenshot_tool')
        os.makedirs(config_dir, exist_ok=True)
        product_key_path = os.path.join(config_dir, 'product_key.txt')

        with open(product_key_path, "w") as file:
            file.write(product_key)

    key_window = tk.Tk()
    key_window.title("Enter Product Key")
    key_window.geometry("400x270")  # Set window size
    key_window.configure(bg='lightgrey')  # Set window background color

    # Make the window always appear on top
    key_window.attributes('-topmost', True)

    # Use a frame to better organize widgets
    frame = tk.Frame(key_window, bg='lightgrey')
    frame.pack(padx=20, pady=20)

    key_label = tk.Label(frame, text="Product Key:", font=("Arial", 14), bg='lightgrey')
    key_label.pack(padx=10, pady=10)

    key_entry = tk.Entry(frame, font=("Arial", 14))
    key_entry.pack(padx=10, pady=10)

    submit_button = tk.Button(frame, text="Confirm", command=submit_key, font=("Arial", 14))
    submit_button.pack(padx=10, pady=10)

    # Add a subtitle
    subtitle_label = tk.Label(frame, text="Please restart the screenshot \ntool after adding a product key", font=("Arial", 10), bg='lightgrey')
    subtitle_label.pack(padx=4, pady=5)

    key_window.mainloop()

def setup_tray_icon():
    image_path = os.path.join(sys._MEIPASS, 'iconFullSize.png') if hasattr(sys, '_MEIPASS') else 'iconFullSize.png'
    image = Image.open(image_path)
    menu = (item('Take Screenshot', launch_app),
            item('Bind PrtScn Key', open_keyboard_settings),
            item('Enter Product Key', enter_product_key),
            item('Exit', exit_action))
    icon = pystray.Icon("QD", image, "QuickData Screenshot Tool", menu)
    icon.run()


def main():
    try:
        global product_key

        # Load the saved product key from the file, if it exists
        try:
            home_dir = os.path.expanduser('~')
            config_dir = os.path.join(home_dir, '.screenshot_tool')
            product_key_path = os.path.join(config_dir, 'product_key.txt')

            with open(product_key_path, "r") as file:
                product_key = file.read().strip()
                print(f"Loaded Product Key: {product_key}")
        except FileNotFoundError:
            print("Product key file not found.")

        keyboard.add_hotkey('print screen', launch_app, args=(None, None))
        setup_tray_icon()
    except Exception as e:
        traceback.print_exc()

if __name__ == "__main__":
    main()