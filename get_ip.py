import socket

def get_local_ip():
    """Get the local IP address of this machine"""
    try:
        # Create a socket to get the local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        # Connect to an external address (doesn't actually send data)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except Exception:
        return "Unable to get IP"

if __name__ == "__main__":
    ip = get_local_ip()
    print("\n" + "="*50)
    print("VOTRE ADRESSE IP LOCALE:")
    print(f"  {ip}")
    print("\nPARTAGEZ CETTE URL AVEC VOTRE AMI:")
    print(f"  http://{ip}:8080")
    print("="*50 + "\n")
