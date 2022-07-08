import { Call, CallAgent, CallClient, DeviceManager, IncomingCall } from '@azure/communication-calling';
import { AzureCommunicationTokenCredential, CommunicationTokenCredential, CommunicationTokenRefreshOptions } from '@azure/communication-common';
import { debug } from 'console';
import { MouseEventHandler } from 'react';
import { Action, Reducer } from 'redux';
import { AppThunkAction } from '.';

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
}

interface IncomingCallEndedAction {
    type: 'INCOMING_CALL_ENDED'
}

// Declare a 'discriminated union' type. This guarantees that all references to 'type' properties contain one of the
// declared type strings (and not any other arbitrary string).
type KnownAction = IncomingCallAction | IncomingCallAcceptedAction | IncomingCallEndedAction | RequestIdentityAction | ReceiveIdentityAction;

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

                console.log("Initialized AzureCommunicationTokenCredential in Identity reducer", token);

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
                        console.log("incomingCallHandler", args.incomingCall);
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

        appState.identity?.incomingCall?.accept().
            then(call => dispatch({
                type: 'INCOMING_CALL_ACCEPTED',
                call: call
            }));

    },
    declineIncomingCall: (e: MouseEvent): AppThunkAction<KnownAction> => (dispatch, getState) => {
        const appState = getState();

        appState.identity?.incomingCall?.reject().
            then(() => dispatch({
                type: 'INCOMING_CALL_ENDED'
            }));
    }
};

   // incoming call is the only one we need to do
                    // when incoming received we need to show way to accept the call anywhere in the app
                    // add the toast notification with button to accept or hangup
                    // why am I not getting a notification in my other browser that a call is incoming
                    // need to fix dispose for when call times out - should clear out the call info on page

// ----------------
// REDUCER - For a given state and action, returns the new state. To support time travel, this must not mutate the old state.

const unloadedState: IdentityState = { identity: null, isLoading: false, token: null, call: null, incomingCall: null, callAgent: null, callClient: new CallClient(), deviceManager: null };

export const reducer: Reducer<IdentityState> = (state: IdentityState | undefined, incomingAction: Action): IdentityState => {
    if (state === undefined)
        return unloadedState;

    const action = incomingAction as KnownAction;

    switch (action.type) {
        case 'INCOMING_CALL':
            console.log("INCOMING_CALL", action);
            return {
                ...state,
                incomingCall: action.incomingCall
            };
        case 'INCOMING_CALL_ACCEPTED':
            console.log("INCOMING_CALL_ACCEPTED", action);
            return {
                ...state,
                incomingCall: null,
                call: action.call
            }
        case 'INCOMING_CALL_ENDED': 
            console.log("INCOMING_CALL_ENDED", action);
            return {
                ...state,
                incomingCall: null
            };
        case 'REQUEST_IDENTITY':
            console.log("REQUEST_IDENTITY", action);
            return {
                ...state,
                identity: action.identity,
                isLoading: true
            };
        case 'RECEIVE_IDENTITY':
            console.log("REQUEST_IDENTITY", action);
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
