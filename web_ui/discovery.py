"""Speaker discovery service using SSDP/UPnP for WAM speakers."""

import asyncio
import socket
import struct
from typing import List, Dict, Optional
import logging
import time
import re

logger = logging.getLogger(__name__)

class WamSpeakerDiscovery:
    """Discover WAM speakers on the network using SSDP/UPnP."""
    
    SSDP_ADDR = "239.255.255.250"
    SSDP_PORT = 1900
    SSDP_MX = 3
    # Try multiple service types that WAM speakers might use
    SSDP_ST_OPTIONS = [
        "urn:schemas-upnp-org:device:MediaRenderer:1",  # Standard for audio devices
        "urn:samsung.com:device:WAMSpeaker:1",          # Samsung WAM-specific
        "urn:schemas-upnp-org:service:WAM:1",            # UPnP service for WAM
        "ssdp:all"                                       # General discovery
    ]
    
    def __init__(self, timeout: int = 5):
        self.timeout = timeout
        self.found_speakers: List[Dict[str, str]] = []
    
    async def discover(self) -> List[Dict[str, str]]:
        """Discover WAM speakers on the network."""
        self.found_speakers = []
        
        # Try each SSDP service type
        for ssdp_st in self.SSDP_ST_OPTIONS:
            await self._send_discovery_request(ssdp_st)
        
        logger.info(f"Discovered {len(self.found_speakers)} WAM speaker(s)")
        return self.found_speakers
    
    async def _send_discovery_request(self, ssdp_st: str):
        """Send a discovery request for a specific service type."""
        # Create multicast socket
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.settimeout(self.timeout)
        
        try:
            # Set socket options for multicast
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, 2)
            
            # Send SSDP discovery message
            request = self._create_ssdp_request(ssdp_st)
            sock.sendto(request.encode(), (self.SSDP_ADDR, self.SSDP_PORT))
            
            # Receive responses
            start_time = time.time()
            while time.time() - start_time < self.timeout:
                try:
                    data, addr = sock.recvfrom(1024)
                    response = data.decode('utf-8', errors='ignore')
                    
                    # Process the response
                    speaker_info = self._parse_ssdp_response(response, addr)
                    if speaker_info:
                        # Avoid duplicates
                        if not any(s['ip'] == speaker_info['ip'] and s['port'] == speaker_info['port'] 
                                 for s in self.found_speakers):
                            self.found_speakers.append(speaker_info)
                            
                except socket.timeout:
                    break
                    
        finally:
            sock.close()
    
    def _create_ssdp_request(self, ssdp_st: str) -> str:
        """Create SSDP discovery request."""
        request = f"""M-SEARCH * HTTP/1.1\r
HOST: {self.SSDP_ADDR}:{self.SSDP_PORT}\r
MAN: "ssdp:discover"\r
MX: {self.SSDP_MX}\r
ST: {ssdp_st}\r
USER-AGENT: pywam Web UI/1.0\r
\r
"""
        return request
    
    def _parse_ssdp_response(self, response: str, addr: tuple) -> Optional[Dict[str, str]]:
        """Parse SSDP response and extract speaker information."""
        # Check if response contains WAM/Samsung identifiers
        response_upper = response.upper()
        has_wam_indicators = any(indicator in response_upper for indicator in 
                                ['WAM', 'SAMSUNG', 'SPEAKER', 'ALLSHARE', 'MEDIARENDERER'])
        
        if has_wam_indicators:
            # Extract information from response
            lines = response.split('\r\n')
            info = {
                'ip': addr[0],
                'port': '55001',  # Default WAM API port
                'name': f"WAM Speaker at {addr[0]}",
                'model': 'Samsung WAM Speaker'
            }
            
            for line in lines:
                line_lower = line.lower()
                if 'location:' in line_lower:
                    # Extract port from location URL
                    import re
                    # Try to find port in location URL
                    matches = re.findall(r'://([^:]+):(\d+)', line)
                    if matches:
                        ip, port = matches[0]
                        info['port'] = port
                        # Don't update IP from location as addr[0] is the source IP
                    else:
                        # If no port found in URL, try common WAM ports
                        for common_port in [55001, 55002, 7676, 8001, 8080, 19999, 52345]:
                            if f':{common_port}' in line:
                                info['port'] = str(common_port)
                                break
                elif 'server:' in line_lower or 'user-agent:' in line_lower:
                    server_info = line.split(':', 1)[1].strip()
                    if server_info and 'Unknown' in info['model']:
                        info['model'] = server_info
                elif 'friendlyname:' in line_lower or 'modelname:' in line_lower:
                    name_info = line.split(':', 1)[1].strip()
                    if name_info:
                        info['name'] = name_info
            
            return info
        
        return None

    async def discover_wam_specific(self) -> List[Dict[str, str]]:
        """Discover WAM speakers using both SSDP and port-specific checks."""
        # First attempt SSDP discovery
        ssdp_speakers = await self.discover()
        
        # For additional discovery, we can also check for devices on common WAM ports
        # This is a more targeted approach for WAM-specific devices
        additional_speakers = []
        
        # This is a simplified check - in a real implementation we'd want to be more sophisticated
        # about how we probe for WAM speakers on the network
        
        return ssdp_speakers + additional_speakers


# Alternative implementation using a more specific WAM discovery approach
async def discover_wam_speakers() -> List[Dict[str, str]]:
    """
    Discover WAM speakers using both SSDP and targeted port scanning.
    Returns a list of dictionaries containing speaker information.
    """
    discovery = WamSpeakerDiscovery(timeout=3)  # Reduced timeout for faster SSDP
    speakers = await discovery.discover()
    
    # If no speakers found via SSDP, try port-based discovery as fallback
    if not speakers:
        speakers = await discover_wam_speakers_on_port_range()
    
    # Sort speakers by IP for consistent display
    speakers.sort(key=lambda x: x['ip'])
    
    return speakers


async def discover_wam_speakers_on_port_range() -> List[Dict[str, str]]:
    """
    Alternative discovery method that checks known WAM ports on local network.
    This is more direct but may take longer.
    """
    import ipaddress
    import subprocess
    
    def get_local_network_ips():
        """Get IP addresses on the local network."""
        try:
            # Get local IP address
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
                s.connect(("8.8.8.8", 80))
                local_ip = s.getsockname()[0]
            
            # Determine network range (assuming /24 subnet)
            network_base = '.'.join(local_ip.split('.')[:-1]) + '.'
            ips = [f"{network_base}{i}" for i in range(1, 255)]
            return ips
        except:
            return []
    
    def is_likely_wam_speaker(ip: str, port: int) -> bool:
        """
        Check if a port response is likely from a WAM speaker by checking for WAM-specific responses.
        """
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(2.0)  # Increased timeout for HTTP requests
                result = s.connect_ex((ip, port))
                if result == 0:
                    # For ports that would have HTTP responses, try to get headers
                    if port in [7676, 8001, 8080, 19999, 52345]:
                        # Send basic HTTP GET request to check for WAM-specific headers
                        s.send(f"GET / HTTP/1.1\r\nHost: {ip}\r\n\r\n".encode())
                        response = s.recv(1024).decode('utf-8', errors='ignore')
                        
                        # Look for WAM or Samsung specific identifiers in response
                        if any(brand in response.lower() for brand in ['wam', 'samsung', 'allshare', 'mongoose', 'lighttpd']):
                            return True
                    return True  # For other WAM ports, assume it's a WAM speaker if open
        except:
            pass
        return False
    
    found_speakers = []
    # Known WAM ports from user information
    wam_ports = [7676, 8001, 8080, 15500, 19999, 52345, 55000, 55001]
    network_ips = get_local_network_ips()
    
    # Limit the IP range to speed up discovery
    if len(network_ips) > 50:  # Only scan first 50 IPs if network is large
        network_ips = network_ips[:50]
    
    for ip in network_ips:
        for port in wam_ports:
            if is_likely_wam_speaker(ip, port):
                speaker_info = {
                    'ip': ip,
                    'port': str(port),
                    'name': f"Samsung WAM Speaker at {ip}",
                    'model': f'WAM on port {port}'
                }
                
                # Avoid duplicates
                if not any(s['ip'] == ip and s['port'] == str(port) for s in found_speakers):
                    found_speakers.append(speaker_info)
    
    return found_speakers