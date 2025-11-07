// JavaScript for WAM Speaker Manager

// App state
let ws = null;
let wsConnected = false;
let selectedSpeaker = null;
let discoveredSpeakers = [];
let reconnectAttempts = 0;
const maxReconnectAttempts = 10;

// DOM elements
const discoverBtn = document.getElementById('discoverBtn');
const discoveredSpeakersList = document.getElementById('discoveredSpeakersList');
const logOutput = document.getElementById('logOutput');
const wsStatus = document.getElementById('wsStatus');
const connectionStatusDiv = document.getElementById('connectionStatusDiv');
const speakerControls = document.getElementById('speakerControls');
const refreshControlsBtn = document.getElementById('refreshControlsBtn');

// Add log message
function addLog(message) {
    const timestamp = new Date().toLocaleTimeString();
    logOutput.textContent += `[${timestamp}] ${message}\n`;
    logOutput.scrollTop = logOutput.scrollHeight;
}

// Update WS status display
function updateWsStatus() {
    if (wsConnected) {
        wsStatus.className = 'ws-status bg-success text-white px-2 py-1 rounded';
        wsStatus.textContent = 'WS: Connected';
    } else {
        wsStatus.className = 'ws-status bg-warning text-white px-2 py-1 rounded';
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
                } else if (data.type === 'pong') {
                    // Response to ping
                    console.log('Server status:', data);
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

// Discover speakers on the network
async function discoverSpeakers() {
    discoverBtn.disabled = true;
    discoverBtn.innerHTML = '<i class="bi bi-search"></i> Discovering...';
    
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
            discoveredSpeakers = speakers;
            addLog(`Found ${speakers.length} speaker(s) on the network`);
            
            if (speakers.length > 0) {
                // Update the discovered speakers list
                updateDiscoveredSpeakersList(speakers);
            } else {
                discoveredSpeakersList.innerHTML = '<p class="text-muted">No WAM speakers found on the network</p>';
            }
        } else {
            addLog(`Discovery failed: ${speakers.length > 0 ? speakers.length : 'Unknown error'}`);
        }
    } catch (error) {
        addLog(`Discovery error: ${error.message}`);
    } finally {
        discoverBtn.disabled = false;
        discoverBtn.innerHTML = '<i class="bi bi-search"></i> Discover Speakers';
    }
}

// Update the discovered speakers list in UI
function updateDiscoveredSpeakersList(speakers) {
    if (speakers.length === 0) {
        discoveredSpeakersList.innerHTML = '<p class="text-muted">No WAM speakers found on the network</p>';
        return;
    }
    
    let html = '';
    speakers.forEach((speaker, index) => {
        html += `
        <div class="speaker-list-item" data-ip="${speaker.ip}" data-port="${speaker.port}">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <strong>${speaker.name || `Speaker ${index + 1}`}</strong><br>
                    <small class="text-muted">${speaker.model || 'Samsung WAM Speaker'} - ${speaker.ip}:${speaker.port}</small>
                </div>
                <div>
                    <button class="btn btn-sm btn-primary connect-btn" data-ip="${speaker.ip}">
                        Connect
                    </button>
                </div>
            </div>
        </div>
        `;
    });
    
    discoveredSpeakersList.innerHTML = html;
    
    // Add event listeners to connect buttons
    document.querySelectorAll('.connect-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const ip = e.target.getAttribute('data-ip');
            connectToSpeaker(ip);
        });
    });
    
    // Add event listeners to speaker items for selection
    document.querySelectorAll('.speaker-list-item').forEach(item => {
        item.addEventListener('click', (e) => {
            // Don't trigger if the connect button was clicked
            if (e.target.classList.contains('connect-btn')) return;
            
            // Remove active class from all items
            document.querySelectorAll('.speaker-list-item').forEach(i => {
                i.classList.remove('active');
            });
            
            // Add active class to clicked item
            item.classList.add('active');
            
            const ip = item.getAttribute('data-ip');
            const port = item.getAttribute('data-port');
            
            // Show speaker details
            showSpeakerDetails(ip, port);
        });
    });
}

// Connect to a specific speaker
async function connectToSpeaker(ip) {
    try {
        addLog(`Connecting to speaker at ${ip}...`);
        const response = await fetch(`/api/speakers/${ip}/connect`, {
            method: 'POST'
        });
        
        if (response.ok) {
            const result = await response.json();
            addLog(`Connected to speaker at ${ip}:${result.port}`);
            
            // Update connection status
            updateConnectionStatus();
            
            // Select this speaker in the UI
            await selectSpeaker(ip);
            
            // Load speaker properties
            loadSpeakerProperties(ip);
        } else {
            const result = await response.json();
            addLog(`Connection failed: ${result.detail || 'Unknown error'}`);
        }
    } catch (error) {
        addLog(`Connection error: ${error.message}`);
    }
}

// Update connection status display
function updateConnectionStatus() {
    if (discoveredSpeakers.length === 0) {
        connectionStatusDiv.innerHTML = '<p class="text-muted">No speakers discovered</p>';
        return;
    }
    
    let html = '<ul class="list-group">';
    discoveredSpeakers.forEach(speaker => {
        const isConnected = selectedSpeaker === speaker.ip;
        html += `
        <li class="list-group-item d-flex justify-content-between align-items-center" style="background-color: var(--card-bg);">
            <div>
                <span class="speaker-status ${isConnected ? 'status-online' : 'status-offline'}"></span>
                <strong>${speaker.name || speaker.ip}</strong><br>
                <small class="text-muted">${speaker.model || 'Samsung WAM Speaker'} - ${speaker.ip}:${speaker.port}</small>
            </div>
            <div>
                ${isConnected ? 
                    '<span class="badge bg-success">Connected</span>' : 
                    '<button class="btn btn-sm btn-outline-primary connect-sm-btn" data-ip="' + speaker.ip + '">Connect</button>'
                }
            </div>
        </li>
        `;
    });
    html += '</ul>';
    
    connectionStatusDiv.innerHTML = html;
    
    // Add event listeners to small connect buttons
    document.querySelectorAll('.connect-sm-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const ip = e.target.getAttribute('data-ip');
            connectToSpeaker(ip);
        });
    });
}

// Select a speaker in the UI
async function selectSpeaker(ip) {
    selectedSpeaker = ip;
    
    // Update connection status display
    updateConnectionStatus();
    
    // Load controls for this speaker
    await loadSpeakerControls(ip);
}

// Load speaker controls
async function loadSpeakerControls(ip) {
    // Get detailed speaker info to display in the controls
    let speakerName = getSpeakerName(ip);
    let speakerModel = 'Samsung WAM Speaker';
    
    try {
        const response = await fetch(`/api/speakers/${ip}/info`);
        if (response.ok) {
            const data = await response.json();
            speakerName = data.info.name || speakerName;
            speakerModel = data.info.model || speakerModel;
        }
    } catch (error) {
        console.log('Could not fetch detailed speaker info:', error.message);
        // Use fallback values
    }
    
    speakerControls.innerHTML = `
    <div class="row mb-3">
        <div class="col-md-6">
            <h5>Control: ${speakerName}</h5>
            <small class="text-muted">${speakerModel}</small>
        </div>
        <div class="col-md-6 text-end">
            <button class="btn btn-sm btn-outline-info" onclick="showSpeakerDetails('${ip}')">
                <i class="bi bi-info-circle"></i> Details
            </button>
        </div>
    </div>
    
    <div class="row">
        <!-- Power Controls -->
        <div class="col-md-12 mb-3">
            <h6>Power</h6>
            <div class="btn-group" role="group">
                <button class="btn btn-primary control-btn" onclick="sendCommand('${ip}', 'power', 'on')">
                    <i class="bi bi-power"></i> On
                </button>
                <button class="btn btn-danger control-btn" onclick="sendCommand('${ip}', 'power', 'off')">
                    <i class="bi bi-power"></i> Off
                </button>
            </div>
        </div>
        
        <!-- Volume Controls -->
        <div class="col-md-12 mb-3">
            <h6>Volume</h6>
            <div class="d-flex align-items-center">
                <button class="btn btn-outline-secondary" onclick="adjustVolume('${ip}', -5)">
                    <i class="bi bi-volume-down"></i>
                </button>
                <input type="range" class="form-control volume-slider mx-2" id="volumeSlider-${ip}" min="0" max="100" value="50">
                <button class="btn btn-outline-secondary" onclick="adjustVolume('${ip}', 5)">
                    <i class="bi bi-volume-up"></i>
                </button>
                <button class="btn btn-outline-secondary ms-2" onclick="sendCommand('${ip}', 'mute', 'on')">
                    <i class="bi bi-volume-mute"></i>
                </button>
            </div>
        </div>
        
        <!-- Playback Controls -->
        <div class="col-md-12 mb-3">
            <h6>Playback</h6>
            <div class="btn-group" role="group">
                <button class="btn btn-primary control-btn" onclick="sendCommand('${ip}', 'prev')">
                    <i class="bi bi-skip-start"></i>
                </button>
                <button class="btn btn-success control-btn" onclick="sendCommand('${ip}', 'play')">
                    <i class="bi bi-play"></i>
                </button>
                <button class="btn btn-warning control-btn" onclick="sendCommand('${ip}', 'pause')">
                    <i class="bi bi-pause"></i>
                </button>
                <button class="btn btn-danger control-btn" onclick="sendCommand('${ip}', 'stop')">
                    <i class="bi bi-stop"></i>
                </button>
                <button class="btn btn-primary control-btn" onclick="sendCommand('${ip}', 'next')">
                    <i class="bi bi-skip-end"></i>
                </button>
            </div>
        </div>
        
        <!-- Input Source -->
        <div class="col-md-12 mb-3">
            <h6>Input Source</h6>
            <select class="form-select" id="inputSource-${ip}">
                <option value="BT">Bluetooth</option>
                <option value="AUX">Auxiliary</option>
                <option value="OPT">Optical</option>
                <option value="HDMI">HDMI</option>
                <option value="USB">USB</option>
            </select>
            <button class="btn btn-primary mt-2" onclick="setInputSource('${ip}')">
                Set Input
            </button>
        </div>
        
        <!-- Equalizer Presets -->
        <div class="col-md-12 mb-3">
            <h6>Equalizer</h6>
            <div class="row">
                <div class="col-md-6">
                    <label class="form-label">EQ Presets</label>
                    <select class="form-select mb-2" id="eqPreset-${ip}">
                        <option value="Normal">Normal</option>
                        <option value="Flat">Flat</option>
                        <option value="Jazz">Jazz</option>
                        <option value="Rock">Rock</option>
                        <option value="Classical">Classical</option>
                        <option value="Bass Boost">Bass Boost</option>
                        <option value="Treble Boost">Treble Boost</option>
                        <option value="Movie">Movie</option>
                        <option value="Voice">Voice</option>
                    </select>
                    <button class="btn btn-primary btn-sm" onclick="setEqPreset('${ip}')">
                        Apply EQ Preset
                    </button>
                </div>
                <div class="col-md-6">
                    <label class="form-label">Manual Equalizer</label>
                    <button class="btn btn-outline-secondary btn-sm d-block mb-2" onclick="resetEqValues('${ip}')">
                        Reset to Flat
                    </button>
                    <button class="btn btn-success btn-sm d-block" onclick="setEqValues('${ip}')">
                        Apply Manual EQ
                    </button>
                </div>
            </div>
            
            <!-- Manual EQ Bands -->
            <div class="row mt-3">
                <div class="col-12">
                    <h6 class="mt-3">Manual EQ Bands:</h6>
                    <div class="eq-controls-container p-3" style="background: rgba(255,255,255,0.05); border-radius: 8px;">
                        <div class="eq-band mb-3">
                            <label class="form-label">150 Hz: <span id="eq150-value-${ip}">0</span>dB</label>
                            <input type="range" class="form-range" id="eq150-${ip}" min="-6" max="6" value="0" 
                                oninput="document.getElementById('eq150-value-${ip}').textContent = this.value">
                        </div>
                        <div class="eq-band mb-3">
                            <label class="form-label">300 Hz: <span id="eq300-value-${ip}">0</span>dB</label>
                            <input type="range" class="form-range" id="eq300-${ip}" min="-6" max="6" value="0" 
                                oninput="document.getElementById('eq300-value-${ip}').textContent = this.value">
                        </div>
                        <div class="eq-band mb-3">
                            <label class="form-label">600 Hz: <span id="eq600-value-${ip}">0</span>dB</label>
                            <input type="range" class="form-range" id="eq600-${ip}" min="-6" max="6" value="0" 
                                oninput="document.getElementById('eq600-value-${ip}').textContent = this.value">
                        </div>
                        <div class="eq-band mb-3">
                            <label class="form-label">1.2 kHz: <span id="eq1200-value-${ip}">0</span>dB</label>
                            <input type="range" class="form-range" id="eq1200-${ip}" min="-6" max="6" value="0" 
                                oninput="document.getElementById('eq1200-value-${ip}').textContent = this.value">
                        </div>
                        <div class="eq-band mb-3">
                            <label class="form-label">2.5 kHz: <span id="eq2500-value-${ip}">0</span>dB</label>
                            <input type="range" class="form-range" id="eq2500-${ip}" min="-6" max="6" value="0" 
                                oninput="document.getElementById('eq2500-value-${ip}').textContent = this.value">
                        </div>
                        <div class="eq-band mb-3">
                            <label class="form-label">5.0 kHz: <span id="eq5000-value-${ip}">0</span>dB</label>
                            <input type="range" class="form-range" id="eq5000-${ip}" min="-6" max="6" value="0" 
                                oninput="document.getElementById('eq5000-value-${ip}').textContent = this.value">
                        </div>
                        <div class="eq-band mb-3">
                            <label class="form-label">10 kHz: <span id="eq10000-value-${ip}">0</span>dB</label>
                            <input type="range" class="form-range" id="eq10000-${ip}" min="-6" max="6" value="0" 
                                oninput="document.getElementById('eq10000-value-${ip}').textContent = this.value">
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;
    
    // Add event listener for volume slider
    const volumeSlider = document.getElementById(`volumeSlider-${ip}`);
    if (volumeSlider) {
        volumeSlider.addEventListener('change', (e) => {
            sendCommand(ip, 'volume', e.target.value);
        });
    }
}

// Set EQ preset
function setEqPreset(ip) {
    const eqSelect = document.getElementById(`eqPreset-${ip}`);
    if (eqSelect) {
        const value = eqSelect.value;
        sendCommand(ip, 'set_eq_preset', value);
    }
}

// Set manual EQ values
function setEqValues(ip) {
    // Get all EQ band values from the sliders
    const eq150 = document.getElementById(`eq150-${ip}`).value;
    const eq300 = document.getElementById(`eq300-${ip}`).value;
    const eq600 = document.getElementById(`eq600-${ip}`).value;
    const eq1200 = document.getElementById(`eq1200-${ip}`).value;
    const eq2500 = document.getElementById(`eq2500-${ip}`).value;
    const eq5000 = document.getElementById(`eq5000-${ip}`).value;
    const eq10000 = document.getElementById(`eq10000-${ip}`).value;
    
    // For now, use a default preset index of 0
    // In the future, we could get the current preset index from the speaker
    const presetIndex = 0;
    
    const values = `${presetIndex},${eq150},${eq300},${eq600},${eq1200},${eq2500},${eq5000},${eq10000}`;
    sendCommand(ip, 'set_eq_values', values);
}

// Reset to flat EQ
function resetEqValues(ip) {
    document.getElementById(`eq150-${ip}`).value = 0;
    document.getElementById(`eq300-${ip}`).value = 0;
    document.getElementById(`eq600-${ip}`).value = 0;
    document.getElementById(`eq1200-${ip}`).value = 0;
    document.getElementById(`eq2500-${ip}`).value = 0;
    document.getElementById(`eq5000-${ip}`).value = 0;
    document.getElementById(`eq10000-${ip}`).value = 0;
    setEqValues(ip);
}

// Get speaker name by IP
function getSpeakerName(ip) {
    const speaker = discoveredSpeakers.find(s => s.ip === ip);
    return speaker ? (speaker.name || ip) : ip;
}

// Send command to speaker
async function sendCommand(ip, command, value = null) {
    try {
        addLog(`Sending command '${command}'${value ? ` with value '${value}'` : ''} to ${ip}`);
        
        const response = await fetch(`/api/speakers/${ip}/command`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                command: command,
                value: value
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            addLog(`Command sent successfully: ${result.command}`);
        } else {
            const result = await response.json();
            addLog(`Command failed: ${result.detail || 'Unknown error'}`);
        }
    } catch (error) {
        addLog(`Command error: ${error.message}`);
    }
}

// Adjust volume
function adjustVolume(ip, amount) {
    const volumeSlider = document.getElementById(`volumeSlider-${ip}`);
    if (volumeSlider) {
        let newVolume = parseInt(volumeSlider.value) + amount;
        newVolume = Math.max(0, Math.min(100, newVolume)); // Clamp between 0 and 100
        volumeSlider.value = newVolume;
        sendCommand(ip, 'volume', newVolume.toString());
    }
}

// Set input source
function setInputSource(ip) {
    const inputSelect = document.getElementById(`inputSource-${ip}`);
    if (inputSelect) {
        const value = inputSelect.value;
        sendCommand(ip, 'set_input', value);
    }
}

// Show speaker details modal
async function showSpeakerDetails(ip, port = null) {
    const detailsBody = document.getElementById('speakerDetailsBody');
    if (!detailsBody) return;
    
    // First try to get detailed info from the API
    try {
        const response = await fetch(`/api/speakers/${ip}/info`);
        
        if (response.ok) {
            const data = await response.json();
            const info = data.info;
            
            detailsBody.innerHTML = `
            <tr><td>IP Address</td><td>${ip}</td></tr>
            <tr><td>Port</td><td>${port || '55001'}</td></tr>
            <tr><td>Name</td><td>${info.name}</td></tr>
            <tr><td>Model</td><td>${info.model}</td></tr>
            <tr><td>MAC Address</td><td>${info.mac}</td></tr>
            <tr><td>Version</td><td>${info.version}</td></tr>
            <tr><td>Power</td><td>${info.power}</td></tr>
            <tr><td>Volume</td><td>${info.volume}</td></tr>
            <tr><td>Input</td><td>${info.input}</td></tr>
            <tr><td>Status</td><td>${selectedSpeaker === ip ? 'Connected' : 'Disconnected'}</td></tr>
            `;
        } else {
            // Fallback to basic info if API call fails
            const speaker = discoveredSpeakers.find(s => s.ip === ip);
            if (speaker) {
                detailsBody.innerHTML = `
                <tr><td>IP Address</td><td>${speaker.ip}</td></tr>
                <tr><td>Port</td><td>${port || speaker.port || '55001'}</td></tr>
                <tr><td>Name</td><td>${speaker.name || 'Unknown'}</td></tr>
                <tr><td>Model</td><td>${speaker.model || 'Samsung WAM Speaker'}</td></tr>
                <tr><td>Status</td><td>${selectedSpeaker === ip ? 'Connected' : 'Disconnected'}</td></tr>
                `;
            } else {
                detailsBody.innerHTML = `
                <tr><td>IP Address</td><td>${ip}</td></tr>
                <tr><td>Status</td><td>Not found in discovered speakers</td></tr>
                `;
            }
        }
    } catch (error) {
        // Fallback to basic info if there's an error
        const speaker = discoveredSpeakers.find(s => s.ip === ip);
        if (speaker) {
            detailsBody.innerHTML = `
            <tr><td>IP Address</td><td>${speaker.ip}</td></tr>
            <tr><td>Port</td><td>${port || speaker.port || '55001'}</td></tr>
            <tr><td>Name</td><td>${speaker.name || 'Unknown'}</td></tr>
            <tr><td>Model</td><td>${speaker.model || 'Samsung WAM Speaker'}</td></tr>
            <tr><td>Status</td><td>${selectedSpeaker === ip ? 'Connected' : 'Disconnected'}</td></tr>
            `;
        } else {
            detailsBody.innerHTML = `
            <tr><td>IP Address</td><td>${ip}</td></tr>
            <tr><td>Status</td><td>Error: ${error.message}</td></tr>
            `;
        }
        addLog(`Error fetching speaker details: ${error.message}`);
    }
    
    // Show the modal using Bootstrap
    const modalElement = document.getElementById('speakerModal');
    const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
    modal.show();
}

// Load speaker properties
async function loadSpeakerProperties(ip) {
    try {
        const response = await fetch(`/api/speakers/${ip}/properties`);
        
        if (response.ok) {
            const data = await response.json();
            addLog(`Loaded properties for speaker at ${ip}`);
            
            // Update volume slider if we have volume info
            if (data.properties && data.properties.volume !== undefined) {
                const volumeSlider = document.getElementById(`volumeSlider-${ip}`);
                if (volumeSlider) {
                    volumeSlider.value = data.properties.volume;
                }
            }
        } else {
            const result = await response.json();
            addLog(`Failed to load properties: ${result.detail || 'Unknown error'}`);
        }
    } catch (error) {
        addLog(`Properties load error: ${error.message}`);
    }
}

// Refresh controls
refreshControlsBtn.addEventListener('click', () => {
    if (selectedSpeaker) {
        loadSpeakerProperties(selectedSpeaker);
        addLog(`Refreshed properties for speaker ${selectedSpeaker}`);
    } else {
        addLog('No speaker selected to refresh');
    }
});

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    addLog('WAM Speaker Manager initialized');
    connectWebSocket();
    updateWsStatus();
    
    // Add event listener for the discover button
    discoverBtn.addEventListener('click', discoverSpeakers);
});

// Periodically ping the server to check connection status
setInterval(() => {
    if (ws && wsConnected && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({type: "ping"}));
    }
}, 30000); // Ping every 30 seconds