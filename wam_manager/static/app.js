// JavaScript for WAM Speaker Manager

// App state
let ws = null;
let wsConnected = false;
let selectedSpeaker = null;
let selectedGroup = null;  // Added for group controls
let discoveredSpeakers = [];
let connectedSpeakers = [];  // Track connected speakers
let speakerGroups = [];  // Track speaker groups
let reconnectAttempts = 0;
const maxReconnectAttempts = 10;

// DOM elements
const discoverBtn = document.getElementById('discoverBtn');
const discoveredSpeakersList = document.getElementById('discoveredSpeakersList');
const connectedSpeakersList = document.getElementById('connectedSpeakersList');  // Added
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

// Get speaker name by IP
function getSpeakerName(ip) {
    const speaker = [...discoveredSpeakers, ...connectedSpeakers].find(s => s.ip === ip);
    return speaker ? (speaker.name || ip) : ip;
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
                    // Request speakers and groups list
                    ws.send(JSON.stringify({type: "request_speakers"}));
                    ws.send(JSON.stringify({type: "request_groups"}));
                } else if (data.type === 'pong') {
                    // Response to ping
                    console.log('Server status:', data);
                } else if (data.type === 'speakers_list') {
                    // Update speakers list
                    connectedSpeakers = data.speakers || [];
                    updateConnectedSpeakersList();
                } else if (data.type === 'groups_list') {
                    // Update groups list
                    speakerGroups = data.groups || [];
                    updateGroupsList();
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
        const isConnected = connectedSpeakers.some(s => s.ip === speaker.ip);
        html += `
        <div class="speaker-list-item" data-ip="${speaker.ip}" data-port="${speaker.port}">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <strong>${speaker.name || `Speaker ${index + 1}`}</strong><br>
                    <small class="text-muted">${speaker.model || 'Samsung WAM Speaker'} - ${speaker.ip}:${speaker.port}</small>
                </div>
                <div>
                    ${isConnected ? 
                        '<span class="badge bg-success">Connected</span>' : 
                        `<button class="btn btn-sm btn-primary connect-btn" data-ip="${speaker.ip}">
                            Connect
                        </button>`
                    }
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

// Update the connected speakers list in UI
function updateConnectedSpeakersList() {
    if (connectedSpeakers.length === 0) {
        connectedSpeakersList.innerHTML = '<p class="text-muted">No speakers connected</p>';
        return;
    }
    
    let html = '<ul class="list-group">';
    connectedSpeakers.forEach(speaker => {
        const isGrouped = speaker.is_grouped;
        html += `
        <li class="list-group-item d-flex justify-content-between align-items-center" style="background-color: var(--card-bg);">
            <div>
                <strong>${speaker.name || speaker.ip}</strong><br>
                <small class="text-muted">${speaker.model || 'Samsung WAM Speaker'} - ${speaker.ip}</small>
                ${isGrouped ? '<span class="badge bg-info ms-1">Grouped</span>' : ''}
            </div>
            <div>
                <button class="btn btn-sm btn-outline-info me-1" onclick="loadSpeakerControls('${speaker.ip}')">
                    <i class="bi bi-controller"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="disconnectSpeaker('${speaker.ip}')">
                    <i class="bi bi-x"></i>
                </button>
            </div>
        </li>
        `;
    });
    html += '</ul>';
    
    connectedSpeakersList.innerHTML = html;
}

// Update groups list in UI
function updateGroupsList() {
    // Find the groups list container
    const groupsListContainer = document.getElementById('groupsList');
    if (!groupsListContainer) return;
    
    if (speakerGroups.length === 0) {
        groupsListContainer.innerHTML = '<p class="text-muted">No speaker groups available</p>';
        return;
    }
    
    let html = '<ul class="list-group">';
    speakerGroups.forEach(group => {
        html += `
        <li class="list-group-item" style="background-color: var(--card-bg);">
            <div class="d-flex justify-content-between align-items-center mb-2">
                <h6 class="mb-0">Group: ${group.id}</h6>
                <button class="btn btn-sm btn-outline-primary" onclick="loadGroupControls('${group.id}')">
                    Control Group
                </button>
            </div>
            <div>
                <small class="text-muted">Speakers in this group:</small>
                <ul class="list-unstyled mt-1">
        `;
        
        group.speakers.forEach(speaker => {
            html += `<li><small>${speaker.name || speaker.ip} (${speaker.ip})</small></li>`;
        });
        
        html += `
                </ul>
            </div>
        </li>
        `;
    });
    html += '</ul>';
    
    groupsListContainer.innerHTML = html;
}

// Disconnect a specific speaker
async function disconnectSpeaker(ip) {
    try {
        addLog(`Disconnecting from speaker at ${ip}...`);
        const response = await fetch(`/api/speakers/${ip}/disconnect`, {
            method: 'POST'
        });
        
        if (response.ok) {
            addLog(`Disconnected from speaker at ${ip}`);
            // Update UI to reflect disconnection
            if (selectedSpeaker === ip) {
                selectedSpeaker = null;
                speakerControls.innerHTML = `
                    <div class="text-center p-4">
                        <i class="bi bi-speaker display-4 text-muted"></i>
                        <p class="mt-3 text-muted">Select a speaker to control</p>
                    </div>
                `;
            }
            // Refresh the connected speakers list
            ws.send(JSON.stringify({type: "request_speakers"}));
        } else {
            const result = await response.json();
            addLog(`Disconnection failed: ${result.detail || 'Unknown error'}`);
        }
    } catch (error) {
        addLog(`Disconnection error: ${error.message}`);
    }
}

// Disconnect all speakers
async function disconnectAllSpeakers() {
    try {
        addLog('Disconnecting from all speakers...');
        const response = await fetch('/api/speakers/disconnect_all', {
            method: 'POST'
        });
        
        if (response.ok) {
            const result = await response.json();
            addLog(`Disconnected from all speakers: ${result.disconnected_ips.join(', ')}`);
            // Update UI
            connectedSpeakers = [];
            speakerGroups = [];
            selectedSpeaker = null;
            selectedGroup = null;
            
            speakerControls.innerHTML = `
                <div class="text-center p-4">
                    <i class="bi bi-speaker display-4 text-muted"></i>
                    <p class="mt-3 text-muted">Select a speaker or group to control</p>
                </div>
            `;
            
            updateConnectedSpeakersList();
            updateGroupsList();
        } else {
            const result = await response.json();
            addLog(`Disconnect all failed: ${result.detail || 'Unknown error'}`);
        }
    } catch (error) {
        addLog(`Disconnect all error: ${error.message}`);
    }
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
    selectedSpeaker = ip;
    selectedGroup = null; // Clear any selected group
    
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
    <div class="speaker-control-header mb-4">
        <div class="d-flex justify-content-between align-items-center">
            <div>
                <h4 class="mb-1"><i class="bi bi-speaker me-2"></i>${speakerName}</h4>
                <p class="text-muted mb-0">${speakerModel} • ${ip}</p>
            </div>
            <div>
                <button class="btn btn-outline-info" onclick="showSpeakerDetails('${ip}')">
                    <i class="bi bi-info-circle me-1"></i>Details
                </button>
            </div>
        </div>
    </div>
    
    <div class="container-fluid">
        <div class="row">
            <!-- Power and Mute Controls -->
            <div class="col-lg-4 mb-4">
                <div class="card h-100 control-card">
                    <div class="card-body">
                        <h5 class="card-title"><i class="bi bi-power me-2"></i>Power Controls</h5>
                        <div class="d-grid gap-2">
                            <button class="btn btn-success btn-lg" onclick="sendCommand('${ip}', 'power', 'on')">
                                <i class="bi bi-power me-2"></i>Power On
                            </button>
                            <button class="btn btn-danger btn-lg" onclick="sendCommand('${ip}', 'power', 'off')">
                                <i class="bi bi-power me-2"></i>Power Off
                            </button>
                        </div>
                        
                        <hr class="my-4">
                        
                        <h5 class="card-title"><i class="bi bi-volume-mute me-2"></i>Mute</h5>
                        <div class="d-grid gap-2">
                            <button class="btn btn-secondary" onclick="sendCommand('${ip}', 'mute', 'on')">
                                <i class="bi bi-volume-mute me-2"></i>Mute
                            </button>
                            <button class="btn btn-secondary" onclick="sendCommand('${ip}', 'mute', 'off')">
                                <i class="bi bi-volume-up me-2"></i>Unmute
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Volume and Playback Controls -->
            <div class="col-lg-4 mb-4">
                <div class="card h-100 control-card">
                    <div class="card-body">
                        <h5 class="card-title"><i class="bi bi-volume-up me-2"></i>Volume</h5>
                        <div class="mb-3">
                            <input type="range" class="form-range" id="volumeSlider-${ip}" min="0" max="100" value="50" 
                                oninput="sendCommand('${ip}', 'volume', this.value)">
                            <div class="d-flex justify-content-between mt-1">
                                <small>0%</small>
                                <small id="volumeValue-${ip}">50%</small>
                                <small>100%</small>
                            </div>
                        </div>
                        
                        <hr class="my-4">
                        
                        <h5 class="card-title"><i class="bi bi-play-circle me-2"></i>Playback</h5>
                        <div class="d-grid gap-2">
                            <div class="btn-group">
                                <button class="btn btn-primary flex-grow-1" onclick="sendCommand('${ip}', 'prev')">
                                    <i class="bi bi-skip-start"></i>
                                </button>
                                <button class="btn btn-success flex-grow-1" onclick="sendCommand('${ip}', 'play')">
                                    <i class="bi bi-play"></i>
                                </button>
                                <button class="btn btn-warning flex-grow-1" onclick="sendCommand('${ip}', 'pause')">
                                    <i class="bi bi-pause"></i>
                                </button>
                                <button class="btn btn-danger flex-grow-1" onclick="sendCommand('${ip}', 'stop')">
                                    <i class="bi bi-stop"></i>
                                </button>
                                <button class="btn btn-primary flex-grow-1" onclick="sendCommand('${ip}', 'next')">
                                    <i class="bi bi-skip-end"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Input and Equalizer Controls -->
            <div class="col-lg-4 mb-4">
                <div class="card h-100 control-card">
                    <div class="card-body">
                        <h5 class="card-title"><i class="bi bi-input-cursor-text me-2"></i>Input Source</h5>
                        <select class="form-select mb-3" id="inputSource-${ip}">
                            <option value="BT">Bluetooth</option>
                            <option value="AUX">Auxiliary</option>
                            <option value="OPT">Optical</option>
                            <option value="HDMI">HDMI</option>
                            <option value="USB">USB</option>
                        </select>
                        <button class="btn btn-primary w-100" onclick="setInputSource('${ip}')">
                            <i class="bi bi-arrow-repeat me-2"></i>Set Input
                        </button>
                        
                        <hr class="my-4">
                        
                        <h5 class="card-title"><i class="bi bi-sliders me-2"></i>Equalizer</h5>
                        <div class="mb-3">
                            <label class="form-label">EQ Presets</label>
                            <select class="form-select" id="eqPreset-${ip}">
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
                        </div>
                        <button class="btn btn-primary w-100 mb-3" onclick="setEqPreset('${ip}')">
                            <i class="bi bi-music-note-beamed me-2"></i>Apply EQ Preset
                        </button>
                        
                        <button class="btn btn-outline-secondary w-100" onclick="toggleEqControls('${ip}')">
                            <i class="bi bi-sliders me-2"></i>Manual EQ Controls
                        </button>
                        
                        <!-- Manual EQ Controls (initially hidden) -->
                        <div id="eqControls-${ip}" class="eq-controls mt-3" style="display: none;">
                            <h6 class="mt-3 mb-2">Manual EQ Bands:</h6>
                            <div class="eq-band mb-2">
                                <label class="form-label">150 Hz: <span id="eq150-value-${ip}">0</span>dB</label>
                                <input type="range" class="form-range" id="eq150-${ip}" min="-6" max="6" value="0" 
                                    oninput="document.getElementById('eq150-value-${ip}').textContent = this.value">
                            </div>
                            <div class="eq-band mb-2">
                                <label class="form-label">300 Hz: <span id="eq300-value-${ip}">0</span>dB</label>
                                <input type="range" class="form-range" id="eq300-${ip}" min="-6" max="6" value="0" 
                                    oninput="document.getElementById('eq300-value-${ip}').textContent = this.value">
                            </div>
                            <div class="eq-band mb-2">
                                <label class="form-label">600 Hz: <span id="eq600-value-${ip}">0</span>dB</label>
                                <input type="range" class="form-range" id="eq600-${ip}" min="-6" max="6" value="0" 
                                    oninput="document.getElementById('eq600-value-${ip}').textContent = this.value">
                            </div>
                            <div class="eq-band mb-2">
                                <label class="form-label">1.2 kHz: <span id="eq1200-value-${ip}">0</span>dB</label>
                                <input type="range" class="form-range" id="eq1200-${ip}" min="-6" max="6" value="0" 
                                    oninput="document.getElementById('eq1200-value-${ip}').textContent = this.value">
                            </div>
                            <div class="eq-band mb-2">
                                <label class="form-label">2.5 kHz: <span id="eq2500-value-${ip}">0</span>dB</label>
                                <input type="range" class="form-range" id="eq2500-${ip}" min="-6" max="6" value="0" 
                                    oninput="document.getElementById('eq2500-value-${ip}').textContent = this.value">
                            </div>
                            <div class="eq-band mb-2">
                                <label class="form-label">5.0 kHz: <span id="eq5000-value-${ip}">0</span>dB</label>
                                <input type="range" class="form-range" id="eq5000-${ip}" min="-6" max="6" value="0" 
                                    oninput="document.getElementById('eq5000-value-${ip}').textContent = this.value">
                            </div>
                            <div class="eq-band mb-2">
                                <label class="form-label">10 kHz: <span id="eq10000-value-${ip}">0</span>dB</label>
                                <input type="range" class="form-range" id="eq10000-${ip}" min="-6" max="6" value="0" 
                                    oninput="document.getElementById('eq10000-value-${ip}').textContent = this.value">
                            </div>
                            
                            <div class="d-grid gap-2 mt-3">
                                <button class="btn btn-outline-secondary" onclick="resetEqValues('${ip}')">
                                    <i class="bi bi-arrow-counterclockwise me-2"></i>Reset to Flat
                                </button>
                                <button class="btn btn-success" onclick="setEqValues('${ip}')">
                                    <i class="bi bi-check-circle me-2"></i>Apply Manual EQ
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;
    
    // Add event listener for volume slider to update the display
    const volumeSlider = document.getElementById(`volumeSlider-${ip}`);
    const volumeValue = document.getElementById(`volumeValue-${ip}`);
    if (volumeSlider && volumeValue) {
        volumeSlider.addEventListener('change', (e) => {
            volumeValue.textContent = `${e.target.value}%`;
            sendCommand(ip, 'volume', e.target.value);
        });
        // Set initial value
        loadSpeakerProperties(ip).then(() => {
            // Once properties are loaded, update the slider position
            if (speakerStates && speakerStates[ip] && speakerStates[ip].volume !== undefined) {
                volumeSlider.value = speakerStates[ip].volume;
                volumeValue.textContent = `${speakerStates[ip].volume}%`;
            }
        });
    }
}

// Load group controls
async function loadGroupControls(groupId) {
    selectedGroup = groupId;
    selectedSpeaker = null; // Clear any selected speaker
    
    // Get the group details
    const group = speakerGroups.find(g => g.id === groupId);
    if (!group) {
        addLog(`Group ${groupId} not found`);
        return;
    }
    
    const speakerNames = group.speakers.map(s => s.name || s.ip).join(', ');
    
    speakerControls.innerHTML = `
    <div class="speaker-control-header mb-4">
        <div class="d-flex justify-content-between align-items-center">
            <div>
                <h4 class="mb-1"><i class="bi bi-collection-play me-2"></i>Group: ${groupId}</h4>
                <p class="text-muted mb-0">Controlling ${group.speakers.length} speakers: ${speakerNames}</p>
            </div>
            <div>
                <button class="btn btn-outline-secondary" onclick="ws.send(JSON.stringify({type: 'request_groups'}))">
                    <i class="bi bi-arrow-repeat me-1"></i>Refresh
                </button>
            </div>
        </div>
    </div>
    
    <div class="container-fluid">
        <div class="row">
            <!-- Power and Mute Controls for Group -->
            <div class="col-lg-4 mb-4">
                <div class="card h-100 control-card">
                    <div class="card-body">
                        <h5 class="card-title"><i class="bi bi-power me-2"></i>Group Power Controls</h5>
                        <div class="d-grid gap-2">
                            <button class="btn btn-success btn-lg" onclick="sendGroupCommand('${groupId}', 'power', 'on')">
                                <i class="bi bi-power me-2"></i>Power On All
                            </button>
                            <button class="btn btn-danger btn-lg" onclick="sendGroupCommand('${groupId}', 'power', 'off')">
                                <i class="bi bi-power me-2"></i>Power Off All
                            </button>
                        </div>
                        
                        <hr class="my-4">
                        
                        <h5 class="card-title"><i class="bi bi-volume-mute me-2"></i>Group Mute</h5>
                        <div class="d-grid gap-2">
                            <button class="btn btn-secondary" onclick="sendGroupCommand('${groupId}', 'mute', 'on')">
                                <i class="bi bi-volume-mute me-2"></i>Mute All
                            </button>
                            <button class="btn btn-secondary" onclick="sendGroupCommand('${groupId}', 'mute', 'off')">
                                <i class="bi bi-volume-up me-2"></i>Unmute All
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Volume and Playback Controls for Group -->
            <div class="col-lg-4 mb-4">
                <div class="card h-100 control-card">
                    <div class="card-body">
                        <h5 class="card-title"><i class="bi bi-volume-up me-2"></i>Group Volume</h5>
                        <div class="mb-3">
                            <input type="range" class="form-range" id="groupVolumeSlider-${groupId}" min="0" max="100" value="50" 
                                oninput="sendGroupCommand('${groupId}', 'volume', this.value)">
                            <div class="d-flex justify-content-between mt-1">
                                <small>0%</small>
                                <small id="groupVolumeValue-${groupId}">50%</small>
                                <small>100%</small>
                            </div>
                        </div>
                        
                        <hr class="my-4">
                        
                        <h5 class="card-title"><i class="bi bi-play-circle me-2"></i>Group Playback</h5>
                        <div class="d-grid gap-2">
                            <div class="btn-group">
                                <button class="btn btn-primary flex-grow-1" onclick="sendGroupCommand('${groupId}', 'prev')">
                                    <i class="bi bi-skip-start"></i>
                                </button>
                                <button class="btn btn-success flex-grow-1" onclick="sendGroupCommand('${groupId}', 'play')">
                                    <i class="bi bi-play"></i>
                                </button>
                                <button class="btn btn-warning flex-grow-1" onclick="sendGroupCommand('${groupId}', 'pause')">
                                    <i class="bi bi-pause"></i>
                                </button>
                                <button class="btn btn-danger flex-grow-1" onclick="sendGroupCommand('${groupId}', 'stop')">
                                    <i class="bi bi-stop"></i>
                                </button>
                                <button class="btn btn-primary flex-grow-1" onclick="sendGroupCommand('${groupId}', 'next')">
                                    <i class="bi bi-skip-end"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Input and Equalizer Controls for Group -->
            <div class="col-lg-4 mb-4">
                <div class="card h-100 control-card">
                    <div class="card-body">
                        <h5 class="card-title"><i class="bi bi-input-cursor-text me-2"></i>Group Input Source</h5>
                        <select class="form-select mb-3" id="groupInputSource-${groupId}">
                            <option value="BT">Bluetooth</option>
                            <option value="AUX">Auxiliary</option>
                            <option value="OPT">Optical</option>
                            <option value="HDMI">HDMI</option>
                            <option value="USB">USB</option>
                        </select>
                        <button class="btn btn-primary w-100" onclick="setGroupInputSource('${groupId}')">
                            <i class="bi bi-arrow-repeat me-2"></i>Set Input for All
                        </button>
                        
                        <hr class="my-4">
                        
                        <h5 class="card-title"><i class="bi bi-sliders me-2"></i>Group Equalizer</h5>
                        <div class="mb-3">
                            <label class="form-label">EQ Presets</label>
                            <select class="form-select" id="groupEqPreset-${groupId}">
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
                        </div>
                        <button class="btn btn-primary w-100 mb-3" onclick="setGroupEqPreset('${groupId}')">
                            <i class="bi bi-music-note-beamed me-2"></i>Apply EQ Preset to All
                        </button>
                        
                        <button class="btn btn-outline-secondary w-100" onclick="toggleGroupEqControls('${groupId}')">
                            <i class="bi bi-sliders me-2"></i>Manual Group EQ Controls
                        </button>
                        
                        <!-- Manual Group EQ Controls (initially hidden) -->
                        <div id="groupEqControls-${groupId}" class="eq-controls mt-3" style="display: none;">
                            <h6 class="mt-3 mb-2">Manual Group EQ Bands:</h6>
                            <div class="eq-band mb-2">
                                <label class="form-label">150 Hz: <span id="groupEq150-value-${groupId}">0</span>dB</label>
                                <input type="range" class="form-range" id="groupEq150-${groupId}" min="-6" max="6" value="0" 
                                    oninput="document.getElementById('groupEq150-value-${groupId}').textContent = this.value">
                            </div>
                            <div class="eq-band mb-2">
                                <label class="form-label">300 Hz: <span id="groupEq300-value-${groupId}">0</span>dB</label>
                                <input type="range" class="form-range" id="groupEq300-${groupId}" min="-6" max="6" value="0" 
                                    oninput="document.getElementById('groupEq300-value-${groupId}').textContent = this.value">
                            </div>
                            <div class="eq-band mb-2">
                                <label class="form-label">600 Hz: <span id="groupEq600-value-${groupId}">0</span>dB</label>
                                <input type="range" class="form-range" id="groupEq600-${groupId}" min="-6" max="6" value="0" 
                                    oninput="document.getElementById('groupEq600-value-${groupId}').textContent = this.value">
                            </div>
                            <div class="eq-band mb-2">
                                <label class="form-label">1.2 kHz: <span id="groupEq1200-value-${groupId}">0</span>dB</label>
                                <input type="range" class="form-range" id="groupEq1200-${groupId}" min="-6" max="6" value="0" 
                                    oninput="document.getElementById('groupEq1200-value-${groupId}').textContent = this.value">
                            </div>
                            <div class="eq-band mb-2">
                                <label class="form-label">2.5 kHz: <span id="groupEq2500-value-${groupId}">0</span>dB</label>
                                <input type="range" class="form-range" id="groupEq2500-${groupId}" min="-6" max="6" value="0" 
                                    oninput="document.getElementById('groupEq2500-value-${groupId}').textContent = this.value">
                            </div>
                            <div class="eq-band mb-2">
                                <label class="form-label">5.0 kHz: <span id="groupEq5000-value-${groupId}">0</span>dB</label>
                                <input type="range" class="form-range" id="groupEq5000-${groupId}" min="-6" max="6" value="0" 
                                    oninput="document.getElementById('groupEq5000-value-${groupId}').textContent = this.value">
                            </div>
                            <div class="eq-band mb-2">
                                <label class="form-label">10 kHz: <span id="groupEq10000-value-${groupId}">0</span>dB</label>
                                <input type="range" class="form-range" id="groupEq10000-${groupId}" min="-6" max="6" value="0" 
                                    oninput="document.getElementById('groupEq10000-value-${groupId}').textContent = this.value">
                            </div>
                            
                            <div class="d-grid gap-2 mt-3">
                                <button class="btn btn-outline-secondary" onclick="resetGroupEqValues('${groupId}')">
                                    <i class="bi bi-arrow-counterclockwise me-2"></i>Reset All to Flat
                                </button>
                                <button class="btn btn-success" onclick="setGroupEqValues('${groupId}')">
                                    <i class="bi bi-check-circle me-2"></i>Apply Manual EQ to All
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;
}

// Toggle manual EQ controls
function toggleEqControls(ip) {
    const eqControls = document.getElementById(`eqControls-${ip}`);
    if (eqControls.style.display === 'none') {
        eqControls.style.display = 'block';
    } else {
        eqControls.style.display = 'none';
    }
}

// Toggle manual group EQ controls
function toggleGroupEqControls(groupId) {
    const groupEqControls = document.getElementById(`groupEqControls-${groupId}`);
    if (groupEqControls.style.display === 'none') {
        groupEqControls.style.display = 'block';
    } else {
        groupEqControls.style.display = 'none';
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

// Set group input source
function setGroupInputSource(groupId) {
    const inputSelect = document.getElementById(`groupInputSource-${groupId}`);
    if (inputSelect) {
        const value = inputSelect.value;
        sendGroupCommand(groupId, 'set_input', value);
    }
}

// Send command to a group
async function sendGroupCommand(groupId, command, value = null) {
    // Find a speaker that belongs to this group to use as reference
    const group = speakerGroups.find(g => g.id === groupId);
    if (!group || group.speakers.length === 0) {
        addLog(`No speakers found in group ${groupId}`);
        return;
    }
    
    const referenceSpeaker = group.speakers[0].ip;
    
    try {
        addLog(`Sending command '${command}'${value ? ` with value '${value}'` : ''} to group ${groupId}`);
        
        const response = await fetch(`/api/speakers/${referenceSpeaker}/command`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                command: command,
                value: value,
                target: "group"
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            addLog(`Group command sent successfully to ${result.success_count} speakers, ${result.fail_count} failed`);
        } else {
            const result = await response.json();
            addLog(`Group command failed: ${result.detail || 'Unknown error'}`);
        }
    } catch (error) {
        addLog(`Group command error: ${error.message}`);
    }
}

// Set group EQ preset
function setGroupEqPreset(groupId) {
    const eqSelect = document.getElementById(`groupEqPreset-${groupId}`);
    if (eqSelect) {
        const value = eqSelect.value;
        sendGroupCommand(groupId, 'set_eq_preset', value);
    }
}

// Set group EQ values
function setGroupEqValues(groupId) {
    // Get all EQ band values from the sliders
    const eq150 = document.getElementById(`groupEq150-${groupId}`).value;
    const eq300 = document.getElementById(`groupEq300-${groupId}`).value;
    const eq600 = document.getElementById(`groupEq600-${groupId}`).value;
    const eq1200 = document.getElementById(`groupEq1200-${groupId}`).value;
    const eq2500 = document.getElementById(`groupEq2500-${groupId}`).value;
    const eq5000 = document.getElementById(`groupEq5000-${groupId}`).value;
    const eq10000 = document.getElementById(`groupEq10000-${groupId}`).value;
    
    // For now, use a default preset index of 0
    const presetIndex = 0;
    
    const values = `${presetIndex},${eq150},${eq300},${eq600},${eq1200},${eq2500},${eq5000},${eq10000}`;
    sendGroupCommand(groupId, 'set_eq_values', values);
}

// Reset group EQ values
function resetGroupEqValues(groupId) {
    document.getElementById(`groupEq150-${groupId}`).value = 0;
    document.getElementById(`groupEq300-${groupId}`).value = 0;
    document.getElementById(`groupEq600-${groupId}`).value = 0;
    document.getElementById(`groupEq1200-${groupId}`).value = 0;
    document.getElementById(`groupEq2500-${groupId}`).value = 0;
    document.getElementById(`groupEq5000-${groupId}`).value = 0;
    document.getElementById(`groupEq10000-${groupId}`).value = 0;
    
    // Update the displayed values
    document.getElementById(`groupEq150-value-${groupId}`).textContent = "0";
    document.getElementById(`groupEq300-value-${groupId}`).textContent = "0";
    document.getElementById(`groupEq600-value-${groupId}`).textContent = "0";
    document.getElementById(`groupEq1200-value-${groupId}`).textContent = "0";
    document.getElementById(`groupEq2500-value-${groupId}`).textContent = "0";
    document.getElementById(`groupEq5000-value-${groupId}`).textContent = "0";
    document.getElementById(`groupEq10000-value-${groupId}`).textContent = "0";
    
    setGroupEqValues(groupId);
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
            const speaker = [...discoveredSpeakers, ...connectedSpeakers].find(s => s.ip === ip);
            if (speaker) {
                detailsBody.innerHTML = `
                <tr><td>IP Address</td><td>${speaker.ip}</td></tr>
                <tr><td>Port</td><td>${port || '55001'}</td></tr>
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
        const speaker = [...discoveredSpeakers, ...connectedSpeakers].find(s => s.ip === ip);
        if (speaker) {
            detailsBody.innerHTML = `
            <tr><td>IP Address</td><td>${speaker.ip}</td></tr>
            <tr><td>Port</td><td>${port || '55001'}</td></tr>
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
                const volumeValue = document.getElementById(`volumeValue-${ip}`);
                if (volumeSlider) {
                    volumeSlider.value = data.properties.volume;
                }
                if (volumeValue) {
                    volumeValue.textContent = `${data.properties.volume}%`;
                }
            }
            
            return data.properties;
        } else {
            const result = await response.json();
            addLog(`Failed to load properties: ${result.detail || 'Unknown error'}`);
            return null;
        }
    } catch (error) {
        addLog(`Properties load error: ${error.message}`);
        return null;
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