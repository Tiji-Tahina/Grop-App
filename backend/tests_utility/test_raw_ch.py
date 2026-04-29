import sys, os; sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import requests

def test_raw_http():
    url = "http://localhost:8123/"
    auth = ('default', 'User_=00')
    try:
        print(f"Tentative de GET {url} avec auth...")
        r = requests.get(url, auth=auth)
        print(f"Status Code: {r.status_code}")
        print(f"Response Body: {r.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_raw_http()
