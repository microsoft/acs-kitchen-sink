import { IncomingCall } from '@azure/communication-calling';
import * as React from 'react';
import { TelephoneInboundFill, TelephoneXFill } from 'react-bootstrap-icons';
import { connect } from 'react-redux';
import { Button, ButtonGroup, Container, Toast, ToastBody, ToastHeader } from 'reactstrap';
import { ApplicationState } from '../store';
import * as IdentityStore from '../store/Identity';
import NavMenu from './NavMenu';


const layout = (props: { children?: React.ReactNode, incomingCall: IncomingCall, acceptIncomingCall: React.MouseEventHandler, declineIncomingCall: React.MouseEventHandler }) => (
    <React.Fragment>
        <NavMenu />
        <Container>
            {props.children}
        </Container>
        <div aria-live="polite" aria-atomic="true">
            <div style={{ position: "absolute", bottom: 0, right: 0, zIndex: 9999, float: "right" }}>
                {props.incomingCall ? (<Toast>
                    <ToastHeader icon="primary">
                        Incoming Call
                    </ToastHeader>
                    <ToastBody>
                        <ButtonGroup>
                            <Button color="primary" onClick={props.acceptIncomingCall}>
                                <TelephoneInboundFill /> Accept
                            </Button>
                            <Button color="danger" onClick={props.declineIncomingCall}>
                                <TelephoneXFill /> Decline
                            </Button>
                        </ButtonGroup>
                    </ToastBody>
                </Toast>) : <></>}
            </div>
        </div>
    </React.Fragment>
);

export default connect((state: ApplicationState) => state.identity, IdentityStore.actionCreators)(layout as any);