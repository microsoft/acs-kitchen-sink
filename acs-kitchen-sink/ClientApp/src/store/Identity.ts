import { Action, Reducer } from 'redux';
import { AppThunkAction } from '.';
import { AzureCommunicationTokenCredential } from '@azure/communication-common';

// -----------------
// STATE - This defines the type of data maintained in the Redux store.

export interface IdentityState {
    isLoading: boolean;
    identity: Identity | null;
    token: AzureCommunicationTokenCredential | null;
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
    token: AzureCommunicationTokenCredential | null;
    isLoading: boolean;
}

// Declare a 'discriminated union' type. This guarantees that all references to 'type' properties contain one of the
// declared type strings (and not any other arbitrary string).
type KnownAction = RequestIdentityAction | ReceiveIdentityAction;

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
                let token = new AzureCommunicationTokenCredential(data.value.accessToken.token.trim());

                dispatch({
                    type: 'RECEIVE_IDENTITY',
                    identity: data.value,
                    token: token,
                    isLoading: false
                });
            });

        dispatch({ type: 'REQUEST_IDENTITY', identity: appState.identity?.identity || null, isLoading: true });
    }
};

// ----------------
// REDUCER - For a given state and action, returns the new state. To support time travel, this must not mutate the old state.

const unloadedState: IdentityState = { identity: null, isLoading: false, token: null };

export const reducer: Reducer<IdentityState> = (state: IdentityState | undefined, incomingAction: Action): IdentityState => {
    if (state === undefined)
        return unloadedState;

    const action = incomingAction as KnownAction;

    switch (action.type) {
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
                identity: action.identity,
                isLoading: false,
                token: action.token
            };
        default:
            return state;
    }
};
