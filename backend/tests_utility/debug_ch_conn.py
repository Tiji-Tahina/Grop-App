import sys, os; sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import clickhouse_connect

def debug_conn():
    try:
        print("Tentative de connexion simple...")
        client = clickhouse_connect.get_client(
            host='localhost', 
            port=8123, 
            username='default', 
            password='User_=00'
        )
        print("✅ Connexion réussie !")
        print(f"Version du serveur : {client.server_version}")
    except Exception as e:
        print(f"❌ Échec de connexion : {e}")

if __name__ == "__main__":
    debug_conn()
