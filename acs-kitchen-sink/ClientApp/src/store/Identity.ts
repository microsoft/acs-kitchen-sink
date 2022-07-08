import { Call, CallAgent, CallClient, DeviceManager, IncomingCall, LocalVideoStream, RemoteParticipant } from '@azure/communication-calling';
import { AzureCommunicationTokenCredential, CommunicationTokenCredential, CommunicationTokenRefreshOptions } from '@azure/communication-common';
import { Action, Reducer } from 'redux';
import { ApplicationState, AppThunkAction } from '.';
import App from '../App';

// -----------------
// STATE - This defines the type of data maintained in the Redux store.

export interface IdentityState {
    isLoading: boolean;
    identity: Identity | null;
    token: AzureCommunicationTokenCredential | null;
    callAgent: CallAgent | null;
    callClient: CallClient;
    deviceManager: DeviceManager | null;
    call: Call | null;
    incomingCall: IncomingCall | null;
    localVideoStream: LocalVideoStream | null;
}

export interface Identity {
    accessToken: { token: string, expiresOn: Date },
    user: { id: string }
}

// -----------------
// ACTIONS - These are serializable (hence replayable) descriptions of state transitions.
// They do not themselves have any side-effects; they just describe something that is going to happen.

interface RequestIdentityAction {
    type: 'REQUEST_IDENTITY';
    identity: Identity | null;
    isLoading: boolean;
}

interface ReceiveIdentityAction {
    type: 'RECEIVE_IDENTITY';
    identity: Identity | null;
    token: AzureCommunicationTokenCredential;
    callAgent: CallAgent;
    deviceManager: DeviceManager;
    isLoading: boolean;
}

interface IncomingCallAction {
    type: 'INCOMING_CALL';
    incomingCall: IncomingCall;
}

interface IncomingCallAcceptedAction {
    type: 'INCOMING_CALL_ACCEPTED';
    call: Call;
    localVideoStream: LocalVideoStream;
}

interface IncomingCallEndedAction {
    type: 'INCOMING_CALL_ENDED'
}

interface StartCallAction {
    type: 'START_CALL';
    call: Call;
    localVideoStream: LocalVideoStream;
}

// Declare a 'discriminated union' type. This guarantees that all references to 'type' properties contain one of the
// declared type strings (and not any other arbitrary string).
type KnownAction = IncomingCallAction | IncomingCallAcceptedAction | IncomingCallEndedAction | RequestIdentityAction | ReceiveIdentityAction | StartCallAction;

// ----------------
// ACTION CREATORS - These are functions exposed to UI components that will trigger a state transition.
// They don't directly mutate state, but they can have external side-effects (such as loading data).

export const actionCreators = {
    requestIdentity: (): AppThunkAction<KnownAction> => (dispatch, getState) => {
        const appState = getState();

        if (appState.identity && appState.identity && appState.identity.identity !== null)
            return;

        fetch(`identity`)
            .then(response => response.json() as Promise<{ value: Identity }>)
            .then((data: { value: Identity }) => {
                let refreshOptions = {
                    tokenRefresher: (abortSignal?: any): Promise<string> => {
                        // todo: build out the endpoint and test best by removing the initial token
                        return (fetch(`identity/token`).then(response => response.json() as Promise<string>));
                    },
                    token: data.value.accessToken.token.trim(),
                    refreshProactively: false
                } as CommunicationTokenRefreshOptions;

                let token = new AzureCommunicationTokenCredential(refreshOptions);

                Promise.all([
                    appState.communication!.callClient.createCallAgent(token as CommunicationTokenCredential),
                    appState.communication!.callClient.getDeviceManager()
                ]).then(([callAgent, deviceManager]) => dispatch({
                    type: 'RECEIVE_IDENTITY',
                    identity: data.value,
                    token: token,
                    callAgent: callAgent,
                    deviceManager,
                    isLoading: false
                })).then(result => {
                    const appState = getState();

                    const incomingCallHandler = async (args: { incomingCall: IncomingCall }): Promise<void> => {
                        try {
                            await appState.identity.deviceManager!.askDevicePermission({ video: true, audio: true });

                            dispatch({
                                type: 'INCOMING_CALL',
                                incomingCall: args.incomingCall
                            });
                        } catch (error) {
                            console.error(error);
                        }
                    }

                    appState.identity.callAgent.on('incomingCall', incomingCallHandler);
                });
            });

        dispatch({ type: 'REQUEST_IDENTITY', identity: appState.identity?.identity || null, isLoading: true });
    },
    acceptIncomingCall: (e: MouseEvent): AppThunkAction<KnownAction> => (dispatch, getState) => {
        const appState = getState();

        createLocalVideoStream(appState.identity.deviceManager).then(localVideoStream => {
            const videoOptions = localVideoStream ? { localVideoStreams: [localVideoStream] } : undefined;

            appState.identity?.incomingCall?.accept({ videoOptions }).
                then(call => {
                    subscribeToCall(call);

                    dispatch({
                        type: 'INCOMING_CALL_ACCEPTED',
                        call: call,
                        localVideoStream: localVideoStream
                    });
                });
        });
    },
    declineIncomingCall: (e: MouseEvent): AppThunkAction<KnownAction> => (dispatch, getState) => {
        const appState = getState();

        appState.identity?.incomingCall?.reject().
            then(() => dispatch({
                type: 'INCOMING_CALL_ENDED'
            }));
    },
    startCall: (calleeId: string): AppThunkAction<KnownAction> => (dispatch, getState) => {
        const appState = getState();

        createLocalVideoStream(appState.identity.deviceManager).then(localVideoStream => {
            const videoOptions = localVideoStream ? { localVideoStreams: [localVideoStream] } : undefined;

            let call = appState.identity.callAgent!.startCall([{ communicationUserId: calleeId.trim() }], { videoOptions });

            subscribeToCall(call);

            dispatch({
                type: 'START_CALL',
                call: call,
                localVideoStream: localVideoStream
            });
        });
    }
};

// todo: handle if they don't allow device access..
const createLocalVideoStream = async (deviceManager: DeviceManager): Promise<LocalVideoStream> => {
    return deviceManager.askDevicePermission({ video: true, audio: true }).then(result => {
        return deviceManager.getCameras().then(cameras => {
            const camera = cameras[0];

            return new LocalVideoStream(camera);
        });
    });
}

const subscribeToCall = async (call: Call): Promise<void> => {
    call.on('idChanged', () => {
        console.log(`Call Id changed: ${call.id}`);
    });
    call.on('stateChanged', async () => {
        console.log(`Call state changed: ${call.state}`);
    });
    call.on('localVideoStreamsUpdated', e => {
        console.log(`Local Video Stream Updated: ${e}`);
        e.added.forEach(async (lvs) => {
            console.log(`Local Video Stream added: ${lvs}`);
        });
        e.removed.forEach(async (lvs) => {
            console.log(`Local Video Stream removed: ${lvs}`);
        })
    });
    call.on('remoteParticipantsUpdated', e => {
        console.log(`Remote Participants Updated: ${e}`);
        e.added.forEach(remoteParticipant => {
            subscribeToRemoteParticipant(remoteParticipant)
        });
        // Unsubscribe from participants that are removed from the call
        e.removed.forEach(remoteParticipant => {
            console.log('Remote participant removed from the call.');
        });
    });
}

const subscribeToRemoteParticipant = async (remoteParticipant: RemoteParticipant): Promise<void> => {
    try {
        // Inspect the initial remoteParticipant.state value.
        console.log(`Remote participant state: ${remoteParticipant.state}`);
        // Subscribe to remoteParticipant's 'stateChanged' event for value changes.
        remoteParticipant.on('stateChanged', () => {
            console.log(`Remote participant state changed: ${remoteParticipant.state}`);
        });

        // Inspect the remoteParticipants's current videoStreams and subscribe to them.
        remoteParticipant.videoStreams.forEach(remoteVideoStream => {
            //subscribeToRemoteVideoStream(remoteVideoStream)
        });
        // Subscribe to the remoteParticipant's 'videoStreamsUpdated' event to be
        // notified when the remoteParticiapant adds new videoStreams and removes video streams.
        remoteParticipant.on('videoStreamsUpdated', e => {
            // Subscribe to new remote participant's video streams that were added.
            e.added.forEach(remoteVideoStream => {
                //subscribeToRemoteVideoStream(remoteVideoStream)
            });
            // Unsubscribe from remote participant's video streams that were removed.
            e.removed.forEach(remoteVideoStream => {
                console.log('Remote participant video stream was removed.');
            })
        });
    } catch (error) {
        console.error(error);
    }
}


// right now I'm kind of stuffing everything in redux - is there a way that it could be better organized into components?


// incoming call is the only one we need to do
// when incoming received we need to show way to accept the call anywhere in the app
// add the toast notification with button to accept or hangup
// why am I not getting a notification in my other browser that a call is incoming
// need to fix dispose for when call times out - should clear out the call info on page
// should eventually separate out permissions and call type into different buttons and actions
// should be able to have multiple remote participants
// video should be something you can pop out and have follow you in small - think youtube videos


// ----------------
// REDUCER - For a given state and action, returns the new state. To support time travel, this must not mutate the old state.

const unloadedState: IdentityState = {
    identity: null,
    isLoading: false,
    token: null,
    call: null,
    incomingCall: null,
    localVideoStream: null,
    callAgent: null,
    callClient: new CallClient(),
    deviceManager: null
};

export const reducer: Reducer<IdentityState> = (state: IdentityState | undefined, incomingAction: Action): IdentityState => {
    if (state === undefined)
        return unloadedState;

    const action = incomingAction as KnownAction;

    switch (action.type) {
        case 'START_CALL':
            return {
                ...state,
                call: action.call,
                localVideoStream: action.localVideoStream
            }
        case 'INCOMING_CALL':
            return {
                ...state,
                incomingCall: action.incomingCall
            };
        case 'INCOMING_CALL_ACCEPTED':
            return {
                ...state,
                incomingCall: null,
                call: action.call
            }
        case 'INCOMING_CALL_ENDED':
            return {
                ...state,
                incomingCall: null
            };
        case 'REQUEST_IDENTITY':
            return {
                ...state,
                identity: action.identity,
                isLoading: true
            };
        case 'RECEIVE_IDENTITY':
            return {
                ...state,
                identity: action.identity,
                isLoading: false,
                token: action.token,
                callAgent: action.callAgent,
                deviceManager: action.deviceManager
            };
        default:
            return state;
    }
};
