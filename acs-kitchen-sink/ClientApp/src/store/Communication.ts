import { CallAgent, CallClient, DeviceManager } from '@azure/communication-calling';
import { CommunicationTokenCredential } from '@azure/communication-common';
import { Action, Reducer } from 'redux';
import { callbackify } from 'util';
import { AppThunkAction } from '.';

export interface CommunicationState {
    callAgent: CallAgent | null,
    callClient: CallClient,
    deviceManager: DeviceManager | null,
}

interface InitCallAgentAction {
    type: 'INIT_CALL_AGENT',
    callAgent: CallAgent
}

interface InitDeviceManagerAction {
    type: 'INIT_DEVICE_MANAGER',
    deviceManager: DeviceManager
}

type KnownAction = InitCallAgentAction | InitDeviceManagerAction;

const unloadedState: CommunicationState = { callAgent: null, callClient: new CallClient(), deviceManager: null };

export const actionCreators = {
    initializeCommunicationService: (callBack?: Function): AppThunkAction<KnownAction> => (dispatch, getState) => {
        const appState = getState();

        if (appState.identity?.token === undefined && appState.communication === undefined)
            return;

        console.log("Using AzureCommunicationTokenCredential in Communication reducer", appState.identity?.token);

        Promise.all([
            appState.communication!.callClient.createCallAgent(appState.identity!.token as CommunicationTokenCredential)
                .then(callAgent => dispatch({
                    type: 'INIT_CALL_AGENT',
                    callAgent: callAgent
                })),
            appState.communication!.callClient.getDeviceManager()
                .then(deviceManager => dispatch({
                    type: 'INIT_DEVICE_MANAGER',
                    deviceManager: deviceManager
                }))
        ]).then(() => callBack);
    }
};

export const reducer: Reducer<CommunicationState> = (state: CommunicationState | undefined, incomingAction: Action): CommunicationState => {
    if (state === undefined)
        return unloadedState;

    const action = incomingAction as KnownAction;

    console.log(action.type, action);

    switch (action.type) {
        case 'INIT_CALL_AGENT':
            return {
                ...state,
                callAgent: action.callAgent
            };
        case 'INIT_DEVICE_MANAGER':
            return {
                ...state,
                deviceManager: action.deviceManager
            };
        default:
            return state;
    };
};