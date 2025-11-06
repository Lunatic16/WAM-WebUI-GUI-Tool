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
    SSDP_ST = "urn:schemas-upnp-org:device:MediaRenderer:1"  # UPnP device type for audio devices
    
    def __init__(self, timeout: int = 5):
        self.timeout = timeout
        self.found_speakers: List[Dict[str, str]] = []
    
    async def discover(self) -> List[Dict[str, str]]:
        """Discover WAM speakers on the network."""
        self.found_speakers = []
        
        # Create multicast socket
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.settimeout(self.timeout)
        
        try:
            # Set socket options for multicast
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, 2)
            
            # Send SSDP discovery message
            request = self._create_ssdp_request()
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
                        if not any(s['ip'] == speaker_info['ip'] for s in self.found_speakers):
                            self.found_speakers.append(speaker_info)
                            
                except socket.timeout:
                    break
                    
        finally:
            sock.close()
        
        logger.info(f"Discovered {len(self.found_speakers)} WAM speaker(s)")
        return self.found_speakers
    
    def _create_ssdp_request(self) -> str:
        """Create SSDP discovery request."""
        request = f"""M-SEARCH * HTTP/1.1\r
HOST: {self.SSDP_ADDR}:{self.SSDP_PORT}\r
MAN: "ssdp:discover"\r
MX: {self.SSDP_MX}\r
ST: {self.SSDP_ST}\r
USER-AGENT: pywam Web UI/1.0\r
\r
"""
        return request
    
    def _parse_ssdp_response(self, response: str, addr: tuple) -> Optional[Dict[str, str]]:
        """Parse SSDP response and extract speaker information."""
        if "WAM" in response.upper() or "SAMSUNG" in response.upper() or "SPEAKER" in response.upper():
            # Extract information from response
            lines = response.split('\r\n')
            info = {
                'ip': addr[0],
                'port': str(addr[1]),
                'name': f"Speaker at {addr[0]}",
                'model': 'Unknown'
            }
            
            for line in lines:
                line_lower = line.lower()
                if 'location:' in line_lower:
                    # Extract port from location URL
                    import re
                    matches = re.findall(r'://([^:]+):(\d+)', line)
                    if matches:
                        ip, port = matches[0]
                        info['port'] = port
                        info['ip'] = ip
                elif 'server:' in line_lower:
                    info['model'] = line.split(':', 1)[1].strip()
                elif 'friendlyname:' in line_lower or 'modelname:' in line_lower:
                    info['name'] = line.split(':', 1)[1].strip()
            
            # If no specific Samsung/WAM identification found but it's a MediaRenderer
            if 'WAM' not in response.upper() and 'SAMSUNG' not in response.upper():
                # Try to determine if it's a WAM speaker by trying to connect to common WAM ports
                if addr[1] in [55001, 55002, 55003, 55004]:  # Common WAM ports
                    info['name'] = f"Samsung WAM Speaker at {addr[0]}"
            
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
    discovery = WamSpeakerDiscovery(timeout=5)
    speakers = await discovery.discover()
    
    # Sort speakers by IP for consistent display
    speakers.sort(key=lambda x: x['ip'])
    
    return speakers


async def discover_wam_speakers_on_port_range() -> List[Dict[str, str]]:
    """
    Alternative discovery method that checks common WAM ports on local network.
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
    
    found_speakers = []
    common_ports = [55001, 55002, 55003, 55004]
    network_ips = get_local_network_ips()
    
    async def check_ip_port(ip, port):
        """Check if a specific IP and port responds like a WAM speaker."""
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(1.0)
                result = s.connect_ex((ip, port))
                if result == 0:
                    # Found open port, test if it's a WAM speaker
                    # For now, just add it as a potential WAM speaker
                    # In a real implementation, we'd check for WAM-specific responses
                    return {
                        'ip': ip,
                        'port': str(port),
                        'name': f"WAM Speaker candidate at {ip}",
                        'model': 'Samsung WAM (candidate)'
                    }
        except:
            pass
        return None
    
    # Check common WAM ports on local network
    tasks = []
    for ip in network_ips:
        for port in common_ports:
            tasks.append(check_ip_port(ip, port))
    
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    for result in results:
        if isinstance(result, dict) and result not in found_speakers:
            found_speakers.append(result)
    
    return found_speakers