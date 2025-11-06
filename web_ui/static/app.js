// Enhanced JavaScript for pywam web UI

// App state
let isConnected = false;
let ws = null;
let wsConnected = false;
let reconnectAttempts = 0;
const maxReconnectAttempts = 10;

// DOM elements
const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const sendApiBtn = document.getElementById('sendApiBtn');
const speakerIp = document.getElementById('speakerIp');
const speakerPort = document.getElementById('speakerPort');
const apiType = document.getElementById('apiType');
const apiMethod = document.getElementById('apiMethod');
const apiPwron = document.getElementById('apiPwron');
const apiTimeout = document.getElementById('apiTimeout');
const apiArgs = document.getElementById('apiArgs');
const propertiesTableBody = document.getElementById('propertiesTableBody');
const eventsList = document.getElementById('eventsList');
const logOutput = document.getElementById('logOutput');
const connectionStatus = document.getElementById('connectionStatus');
const wsStatus = document.getElementById('wsStatus');
const refreshPropertiesBtn = document.getElementById('refreshPropertiesBtn');
const refreshEventsBtn = document.getElementById('refreshEventsBtn');
const clearEventsBtn = document.getElementById('clearEventsBtn');

// Add log message
function addLog(message) {
    const timestamp = new Date().toLocaleTimeString();
    logOutput.textContent += `[${timestamp}] ${message}\n`;
    logOutput.scrollTop = logOutput.scrollHeight;
}

// Update connection status display
function updateConnectionStatus() {
    if (isConnected) {
        connectionStatus.className = 'connection-status bg-success text-white px-2 py-1 rounded';
        connectionStatus.textContent = 'Connected';
        connectBtn.disabled = true;
        disconnectBtn.disabled = false;
        sendApiBtn.disabled = false;
    } else {
        connectionStatus.className = 'connection-status bg-secondary px-2 py-1 rounded';
        connectionStatus.textContent = 'Disconnected';
        connectBtn.disabled = false;
        disconnectBtn.disabled = true;
        sendApiBtn.disabled = true;
    }
}

// Update WS status display
function updateWsStatus() {
    if (wsConnected) {
        wsStatus.className = 'ws-status bg-success text-white px-2 py-1 rounded';
        wsStatus.textContent = 'WS: Connected';
    } else {
        wsStatus.className = 'ws-status bg-warning text-dark px-2 py-1 rounded';
        wsStatus.textContent = 'WS: Connecting...';
    }
}

// Connect to WebSocket
function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
        ws = new WebSocket(wsUrl);
        
        ws.onopen = function(event) {
            console.log('WebSocket connected');
            wsConnected = true;
            reconnectAttempts = 0; // Reset reconnect attempts
            updateWsStatus();
            addLog('WebSocket connected');
            
            // Send a ping to test the connection
            ws.send(JSON.stringify({type: "ping"}));
        };
        
        ws.onmessage = function(event) {
            console.log('Message received:', event.data);
            // Handle real-time updates from server
            try {
                const data = JSON.parse(event.data);
                
                if (data.type === 'connected') {
                    // Initial connection confirmation
                    addLog('WebSocket connection established');
                } else if (data.type === 'event') {
                    addEventToList(data.event);
                    addLog(`Event received: ${data.event.method}`);
                } else if (data.type === 'property_update') {
                    updatePropertiesTable(data.properties);
                    addLog('Properties updated');
                } else if (data.type === 'pong') {
                    // Response to ping
                    isConnected = data.connected;
                    updateConnectionStatus();
                } else {
                    console.log('Unknown message type:', data);
                }
            } catch (e) {
                console.log('Non-JSON message:', event.data);
            }
        };
        
        ws.onclose = function(event) {
            console.log('WebSocket closed:', event.code, event.reason);
            wsConnected = false;
            updateWsStatus();
            addLog('WebSocket disconnected');
            
            // Try to reconnect with exponential backoff
            if (reconnectAttempts < maxReconnectAttempts) {
                reconnectAttempts++;
                const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // Max 30 seconds
                addLog(`Attempting to reconnect in ${delay/1000} seconds... (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
                
                setTimeout(connectWebSocket, delay);
            } else {
                addLog('Max reconnection attempts reached. Please refresh the page to try again.');
            }
        };
        
        ws.onerror = function(error) {
            console.error('WebSocket error:', error);
            addLog('WebSocket error: ' + error.message);
        };
    } catch (e) {
        console.error('Failed to connect WebSocket:', e);
        addLog('Failed to connect WebSocket: ' + e.message);
        
        if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
            setTimeout(connectWebSocket, delay);
        }
    }
}

// Connect to speaker
connectBtn.addEventListener('click', async () => {
    try {
        const response = await fetch('/api/connect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ip: speakerIp.value,
                port: parseInt(speakerPort.value, 10)  // Ensure base 10 parsing
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            isConnected = true;
            updateConnectionStatus();
            addLog(`Connected to speaker at ${speakerIp.value}:${speakerPort.value}`);
            loadProperties(); // Load properties after connecting
        } else {
            let errorMessage = 'Unknown error';
            try {
                const result = await response.json();
                errorMessage = result.detail || JSON.stringify(result);
            } catch (e) {
                // If response is not JSON, try to get text
                try {
                    errorMessage = await response.text();
                } catch (e2) {
                    errorMessage = 'Unable to parse error response';
                }
            }
            addLog(`Connection failed: ${errorMessage}`);
        }
    } catch (error) {
        addLog(`Connection error: ${error.message}`);
    }
});

// Disconnect from speaker
disconnectBtn.addEventListener('click', async () => {
    try {
        const response = await fetch('/api/disconnect', {
            method: 'POST'
        });
        
        if (response.ok) {
            isConnected = false;
            updateConnectionStatus();
            addLog('Disconnected from speaker');
            
            // Clear properties table
            propertiesTableBody.innerHTML = '<tr><td colspan="4" class="text-center">Connect to a speaker to see properties</td></tr>';
        } else {
            let errorMessage = 'Unknown error';
            try {
                const result = await response.json();
                errorMessage = result.detail || JSON.stringify(result);
            } catch (e) {
                // If response is not JSON, try to get text
                try {
                    errorMessage = await response.text();
                } catch (e2) {
                    errorMessage = 'Unable to parse error response';
                }
            }
            addLog(`Disconnection failed: ${errorMessage}`);
        }
    } catch (error) {
        addLog(`Disconnection error: ${error.message}`);
    }
});

// Send API request
sendApiBtn.addEventListener('click', async () => {
    try {
        // Validate arguments JSON
        let args = [];
        if (apiArgs.value.trim() !== '') {
            try {
                args = JSON.parse(apiArgs.value);
            } catch (e) {
                addLog(`Invalid arguments JSON: ${e.message}`);
                return;
            }
        }
        
        const response = await fetch('/api/send_api', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                api_type: apiType.value,
                method: apiMethod.value,
                pwron: apiPwron.checked,
                args: args,
                expected_response: "",  // Default empty
                user_check: false,      // Default false
                timeout: parseInt(apiTimeout.value, 10)
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            addLog(`API request sent: ${apiType.value}.${apiMethod.value}`);
        } else {
            let errorMessage = 'Unknown error';
            try {
                const result = await response.json();
                errorMessage = result.detail || JSON.stringify(result);
            } catch (e) {
                // If response is not JSON, try to get text
                try {
                    errorMessage = await response.text();
                } catch (e2) {
                    errorMessage = 'Unable to parse error response';
                }
            }
            addLog(`API request failed: ${errorMessage}`);
        }
    } catch (error) {
        addLog(`API request error: ${error.message}`);
    }
});

// Load properties from server
async function loadProperties() {
    if (!isConnected) return;
    
    try {
        const response = await fetch('/api/properties');
        
        if (response.ok) {
            const data = await response.json();
            updatePropertiesTable(data.properties);
        } else {
            let errorMessage = 'Unknown error';
            try {
                const result = await response.json();
                errorMessage = result.detail || JSON.stringify(result);
            } catch (e) {
                // If response is not JSON, try to get text
                try {
                    errorMessage = await response.text();
                } catch (e2) {
                    errorMessage = 'Unable to parse error response';
                }
            }
            addLog(`Failed to load properties: ${errorMessage}`);
        }
    } catch (error) {
        addLog(`Error loading properties: ${error.message}`);
    }
}

// Update properties table with data
function updatePropertiesTable(properties) {
    if (!properties) return;
    
    propertiesTableBody.innerHTML = '';
    
    const timeNow = new Date().toLocaleTimeString();
    Object.entries(properties).forEach(([key, value]) => {
        let valueType = '';
        let valueStr = '';
        
        if (value === null) {
            valueType = '';
            valueStr = '';
        } else {
            valueType = typeof value;
            if (Array.isArray(value)) {
                valueStr = value.join(', ');
            } else {
                valueStr = String(value);
            }
        }
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${timeNow}</td>
            <td>${key}</td>
            <td>${valueType}</td>
            <td>${valueStr}</td>
        `;
        propertiesTableBody.appendChild(row);
    });
    
    if (Object.keys(properties).length === 0) {
        propertiesTableBody.innerHTML = '<tr><td colspan="4" class="text-center">No properties available</td></tr>';
    }
}

// Load events from server
async function loadEvents() {
    try {
        const response = await fetch('/api/events?limit=20');
        
        if (response.ok) {
            const data = await response.json();
            eventsList.innerHTML = '';
            
            if (data.events.length > 0) {
                data.events.forEach(event => {
                    addEventToList(event);
                });
            } else {
                eventsList.innerHTML = '<p class="text-muted">No events received yet</p>';
            }
        } else {
            let errorMessage = 'Unknown error';
            try {
                const result = await response.json();
                errorMessage = result.detail || JSON.stringify(result);
            } catch (e) {
                // If response is not JSON, try to get text
                try {
                    errorMessage = await response.text();
                } catch (e2) {
                    errorMessage = 'Unable to parse error response';
                }
            }
            addLog(`Failed to load events: ${errorMessage}`);
        }
    } catch (error) {
        addLog(`Error loading events: ${error.message}`);
    }
}

// Add event to the events list
function addEventToList(event) {
    const eventDiv = document.createElement('div');
    eventDiv.className = 'event-list-item';
    
    const method = event.method || 'Unknown';
    const time = new Date().toLocaleTimeString();
    
    // Truncate long raw responses
    let rawResponse = event.raw_response || '';
    if (rawResponse.length > 100) {
        rawResponse = rawResponse.substring(0, 100) + '...';
    }
    
    eventDiv.innerHTML = `
        <div><strong>${time}</strong> - ${method}</div>
        <small class="text-muted">${rawResponse}</small>
        <hr>
    `;
    
    // Add to the top of the list
    if (eventsList.firstChild) {
        eventsList.insertBefore(eventDiv, eventsList.firstChild);
    } else {
        eventsList.appendChild(eventDiv);
    }
    
    // Keep only the latest 50 events
    if (eventsList.children.length > 50) {
        eventsList.removeChild(eventsList.lastChild);
    }
}

// Refresh properties button
refreshPropertiesBtn.addEventListener('click', loadProperties);

// Refresh events button
refreshEventsBtn.addEventListener('click', loadEvents);

// Clear events button
clearEventsBtn.addEventListener('click', () => {
    eventsList.innerHTML = '<p class="text-muted">Events cleared. Connect to see new events.</p>';
});

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    addLog('Web UI initialized');
    connectWebSocket();
    updateConnectionStatus();
    updateWsStatus();
    
    // Add event listener for the discover button if it exists
    const discoverBtn = document.getElementById('discoverBtn');
    if (discoverBtn) {
        discoverBtn.addEventListener('click', discoverSpeakers);
    }
    
    // Initialize speaker selection handling
    handleSpeakerSelection();
});

// Discover speakers on the network
async function discoverSpeakers() {
    const discoverBtn = document.getElementById('discoverBtn');
    if (discoverBtn) {
        discoverBtn.disabled = true;
        discoverBtn.innerHTML = '<i class="bi bi-search"></i> Discovering...';
    }
    
    try {
        addLog('Discovering WAM speakers on the network...');
        const response = await fetch('/api/discover');
        
        let speakers = [];
        try {
            const data = await response.json();
            speakers = data.speakers || [];
        } catch (e) {
            // If response is not JSON, try to get text
            try {
                const responseText = await response.text();
                addLog(`Discovery failed: ${responseText}`);
                return;
            } catch (e2) {
                addLog('Discovery failed: Unable to parse response');
                return;
            }
        }
        
        if (response.ok) {
            addLog(`Found ${speakers.length} speaker(s) on the network`);
            
            if (speakers.length > 0) {
                // Update the speaker selection dropdown
                updateSpeakerList(speakers);
                
                // If only one speaker is found, auto-populate the fields
                if (speakers.length === 1) {
                    speakerIp.value = speakers[0].ip;
                    speakerPort.value = speakers[0].port;
                    addLog(`Auto-selected: ${speakers[0].name || speakers[0].ip}`);
                }
            } else {
                addLog('No WAM speakers found on the network');
                // Still update dropdown with empty list to clear it
                updateSpeakerList([]);
            }
        } else {
            addLog(`Discovery failed: ${speakers.length > 0 ? speakers.length : 'Unknown error'}`);
        }
    } catch (error) {
        addLog(`Discovery error: ${error.message}`);
    } finally {
        if (discoverBtn) {
            discoverBtn.disabled = false;
            discoverBtn.innerHTML = '<i class="bi bi-search"></i> Discover';
        }
    }
}

// Update speaker list in the dropdown
function updateSpeakerList(speakers) {
    const speakerDropdown = document.getElementById('speakerDropdown');
    if (!speakerDropdown) return; // If no dropdown exists, skip this
    
    // Clear existing options (except the first "Select Speaker" option)
    speakerDropdown.innerHTML = '<option value="">Select a Speaker</option>';
    
    if (speakers.length > 0) {
        speakers.forEach((speaker, index) => {
            const option = document.createElement('option');
            option.value = `${speaker.ip}:${speaker.port}`;
            option.textContent = `${speaker.name || `Speaker ${index + 1}`} - ${speaker.ip}:${speaker.port}`;
            speakerDropdown.appendChild(option);
        });
        
        // Make dropdown visible if it has content
        speakerDropdown.style.display = 'block';
    } else {
        // Hide dropdown if no speakers found
        speakerDropdown.style.display = 'none';
    }
}

// Handle speaker selection from dropdown
function handleSpeakerSelection() {
    const speakerDropdown = document.getElementById('speakerDropdown');
    if (!speakerDropdown) return;
    
    speakerDropdown.addEventListener('change', function() {
        if (this.value) {
            const [ip, port] = this.value.split(':');
            speakerIp.value = ip;
            speakerPort.value = port;
        }
    });
}

// Periodically ping the server to check connection status
setInterval(() => {
    if (ws && wsConnected && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({type: "ping"}));
    }
}, 30000); // Ping every 30 seconds