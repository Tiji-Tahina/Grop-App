import sys, os; sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import clickhouse_connect

def debug_conn():
    try:
        print("Attempting connection on 127.0.0.1 with User_=00...")
        client = clickhouse_connect.get_client(
            host='127.0.0.1',
            port=8123,
            username='default',
            password='User_=00'
        )
        print("✅ Connection successful!")
        print(f"Server version: {client.server_version}")
    except Exception as e:
        print(f"❌ Connection failed: {e}")

if __name__ == "__main__":
    debug_conn()
