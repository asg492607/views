import time
from selenium import webdriver

def auto_refresh(url, intervals):
    print("Starting browser...")
    try:
        # Initialize the Chrome driver
        # Make sure you have pip installed selenium: `pip install selenium`
        driver = webdriver.Chrome()
        driver.get(url)
        
        print(f"Successfully opened {url}. Starting the refresh cycle...")
        print("Press Ctrl+C in this terminal to stop.")
        
        while True:
            for interval in intervals:
                print(f"Waiting for {interval} seconds...")
                time.sleep(interval)
                print("Refreshing the page...")
                driver.refresh()
                
    except KeyboardInterrupt:
        print("\nProcess interrupted by user. Stopping auto-refresher...")
    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        try:
            driver.quit()
        except:
            pass

if __name__ == "__main__":
    print("=== Custom Link Auto-Refresher ===")
    target_url = input("Enter the link you want to refresh (e.g., https://example.com): ")
    
    # Ensure the URL has http:// or https://
    if not target_url.startswith("http"):
        target_url = "https://" + target_url
        
    intervals_input = input("Enter the refresh intervals in seconds (comma-separated, e.g., 30, 40, 120): ")
    
    try:
        # Parse the comma-separated string into a list of integers
        intervals_list = [int(i.strip()) for i in intervals_input.split(',')]
        if not intervals_list:
            print("No intervals provided. Defaulting to 30 seconds.")
            intervals_list = [30]
            
        auto_refresh(target_url, intervals_list)
        
    except ValueError:
        print("Error: Invalid intervals provided. Please run the script again and enter only numbers separated by commas.")
