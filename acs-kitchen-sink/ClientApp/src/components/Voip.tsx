import { Call, LocalVideoStream, RemoteParticipant, VideoStreamRenderer, VideoStreamRendererView } from '@azure/communication-calling';
import { debug } from 'console';
import * as React from 'react';
import { connect } from 'react-redux';
import { Button, ButtonGroup, Col, Form, FormGroup, Input, Label } from 'reactstrap';
import { ApplicationState } from '../store';
import * as IdentityStore from '../store/Identity';

type VoipProps = IdentityStore.IdentityState & typeof IdentityStore.actionCreators;

interface VoipState {
    calleeId: string | null,
    enableStartCallButton: boolean,
    enableHangUpButton: boolean,
    enableStartVideoButton: boolean,
    enableEndVideoButton: boolean,
    localVideoStream: LocalVideoStream | null,
    localVideoView: VideoStreamRendererView | null,
    remoteVideoView: VideoStreamRendererView | null,
    localVideoStreamRenderer: VideoStreamRenderer | null,
    remoteVideoStreamRenderer: VideoStreamRenderer | null,
    callSubscribed: boolean
}

export class Voip extends React.PureComponent<VoipProps, VoipState> {
    constructor(props: VoipProps) {
        super(props);

        this.state = {
            calleeId: null,
            enableStartCallButton: false,
            enableHangUpButton: false,
            enableStartVideoButton: false,
            enableEndVideoButton: false,
            localVideoStream: null,
            localVideoView: null,
            remoteVideoView: null,
            localVideoStreamRenderer: null,
            remoteVideoStreamRenderer: null,
            callSubscribed: false
        };
    }

    public componentDidMount() {
        if (this.props.call) // subscribe to all call events
            this.subscribeToCall(this.props.call);
    }

    public componentDidUpdate() {
        console.log("componentDidUpdate: callSubscribed", this.state.callSubscribed)
        if (!this.state.callSubscribed && this.props.call) // subscribe to all call events
            this.setState({
                callSubscribed: true
            }, () => this.subscribeToCall(this.props.call));
    }

    // we can use this in the component and just force anyone who accepts a call to go to this component and on dismount just hangup the call
    public subscribeToCall = async (call: Call): Promise<void> => {
        try {
            // Inspect the initial call.id value.
            console.log(`Call Id: ${call.id}`);

            //Subscribe to call's 'idChanged' event for value changes.
            call.on('idChanged', () => {
                console.log(`Call Id changed: ${call.id}`);
            });

            // Inspect the initial call.state value.
            console.log(`Call state: ${call.state}`);

            // Subscribe to call's 'stateChanged' event for value changes.
            call.on('stateChanged', async () => {
                console.log(`Call state changed: ${call.state}`);
                if (call.state === 'Connected') {
                    this.setState({
                        enableStartCallButton: false,
                        enableHangUpButton: true,
                        enableStartVideoButton: false,
                        enableEndVideoButton: false
                    });
                } else if (call.state === 'Disconnected') {
                    this.setState({
                        enableStartCallButton: true,
                        enableHangUpButton: false,
                        enableStartVideoButton: false,
                        enableEndVideoButton: false
                    });
                    console.log(`Call ended, call end reason={code=${call.callEndReason.code}, subCode=${call.callEndReason.subCode}}`);
                }
            });

            call.localVideoStreams.forEach(async (lvs) => {
                this.setState({
                    localVideoStream: lvs
                }, async () => await this.displayLocalVideoStream());
            });

            call.on('localVideoStreamsUpdated', e => {
                e.added.forEach(async (lvs) => {
                    this.setState({
                        localVideoStream: lvs
                    }, async () => await this.displayLocalVideoStream());
                });
                e.removed.forEach(lvs => {
                    this.removeLocalVideoStream();
                });
            });

            // Inspect the call's current remote participants and subscribe to them.
            call.remoteParticipants.forEach(remoteParticipant => {
                this.subscribeToRemoteParticipant(remoteParticipant);
            });
            // Subscribe to the call's 'remoteParticipantsUpdated' event to be
            // notified when new participants are added to the call or removed from the call.
            call.on('remoteParticipantsUpdated', e => {
                // Subscribe to new remote participants that are added to the call.
                e.added.forEach(remoteParticipant => {
                    this.subscribeToRemoteParticipant(remoteParticipant)
                });
                // Unsubscribe from participants that are removed from the call
                e.removed.forEach(remoteParticipant => {
                    console.log('Remote participant removed from the call.');
                });
            });
        } catch (error) {
            console.error(error);
        }
    }

    public subscribeToRemoteParticipant = async (remoteParticipant: RemoteParticipant): Promise<void> => {
        try {
            // Inspect the initial remoteParticipant.state value.
            console.log(`Remote participant state: ${remoteParticipant.state}`);
            // Subscribe to remoteParticipant's 'stateChanged' event for value changes.
            remoteParticipant.on('stateChanged', () => {
                console.log(`Remote participant state changed: ${remoteParticipant.state}`);
            });

            // Inspect the remoteParticipants's current videoStreams and subscribe to them.
            remoteParticipant.videoStreams.forEach(remoteVideoStream => {
                this.subscribeToRemoteVideoStream(remoteVideoStream)
            });
            // Subscribe to the remoteParticipant's 'videoStreamsUpdated' event to be
            // notified when the remoteParticiapant adds new videoStreams and removes video streams.
            remoteParticipant.on('videoStreamsUpdated', e => {
                // Subscribe to new remote participant's video streams that were added.
                e.added.forEach(remoteVideoStream => {
                    this.subscribeToRemoteVideoStream(remoteVideoStream)
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

    public subscribeToRemoteVideoStream = async (remoteVideoStream) => {
        this.setState({
            remoteVideoStreamRenderer: new VideoStreamRenderer(remoteVideoStream)
        }, async () => {
            const createView = async () => {
                let view = await this.state.remoteVideoStreamRenderer.createView();

                const targetContainer = document.getElementById('remote-video-container');

                targetContainer.appendChild(view.target);
            }

            remoteVideoStream.on('isAvailableChanged', async () => {
                try {
                    if (remoteVideoStream.isAvailable) {
                        await createView();
                    } else {
                        this.state.remoteVideoView.dispose();

                        this.setState({
                            remoteVideoView: null,
                            remoteVideoStreamRenderer: null
                        });
                    }
                } catch (e) {
                    console.error(e);
                }
            });

            // Remote participant has video on initially.
            if (remoteVideoStream.isAvailable) {
                try {
                    await createView();
                } catch (e) {
                    console.error(e);
                }
            }
        });
    }

    public displayLocalVideoStream = async () => {
        try {
            this.setState({
                localVideoStreamRenderer: new VideoStreamRenderer(this.state.localVideoStream)
            }, async () => {
                const view = await this.state.localVideoStreamRenderer.createView();

                const targetContainer = document.getElementById('local-video-container');

                targetContainer.appendChild(view.target);
            });
        } catch (error) {
            console.error(error);
        }
    }

    public removeLocalVideoStream = async () => {
        try {
            this.state.localVideoStreamRenderer.dispose();

            this.setState({
                localVideoStreamRenderer: null,
                localVideoStream: null,
                localVideoView: null
            });
        } catch (error) {
            console.error(error);
        }
    }

    public onChange = (e: any) => this.setState({
        calleeId: e.target.value,
        enableStartCallButton: e.target.value.length === 79
    });

    public render = (): React.ReactNode => {
        let callStatus = this.props.call !== null ? (
            <>
                <FormGroup row >
                    <Label for="callId" sm={2}>Call ID</Label>
                    <Col sm={10}>
                        <Input type="text" name="callId" id="callId" value={this.props.call?.id} readOnly />
                    </Col>
                </FormGroup>
                <FormGroup row >
                    <Label for="callState" sm={2}>Call State</Label>
                    <Col sm={10}>
                        <Input type="text" name="callState" id="callState" value={this.props.call?.state} readOnly />
                    </Col>
                </FormGroup>
            </>) : (<div></div>);

        return (<>
            <h1>Voice over Internet Protocol</h1>
            <Form>
                {this.props.call?.direction === "Incoming" ? 
                    <FormGroup row >
                        <Label for="callee" sm={2}>Caller</Label>
                        <Col sm={10}>
                            <Input type="text" name="caller" id="caller" readOnly value={this.props.call.callerInfo.identifier[Object.keys(this.props.call.callerInfo.identifier)[0]]} />
                        </Col>
                        <br />
                    </FormGroup> :
                    <FormGroup row >
                        <Label for="callee" sm={2}>Callee</Label>
                        <Col sm={10}>
                            <Input type="text" name="callee" id="callee" placeholder="Recipient ACS ID" onChange={this.onChange} />
                        </Col>
                        <br />
                    </FormGroup>}
                {callStatus}
            </Form>
            <br />
            <FormGroup>
                <ButtonGroup>
                    <Button disabled={!this.state.enableStartCallButton} onClick={() => this.props.startCall(this.state.calleeId)}>Start Call</Button>
                    <Button disabled={!this.state.enableHangUpButton}>Hang Up</Button>
                </ButtonGroup>
            </FormGroup>
            <FormGroup>
                <ButtonGroup>
                    <Button disabled={!this.state.enableStartVideoButton}>Start Video</Button>
                    <Button disabled={!this.state.enableEndVideoButton}>End Video</Button>
                </ButtonGroup>
            </FormGroup>
            <br />
            <div id="local-video-container"></div>
            <div className="remote-video-container"></div>
            <br />
            {}
        </>);
    }
}
//{this.state.remoteVideoView ?  : <></>}
export default connect((state: ApplicationState) => state.identity, IdentityStore.actionCreators)(Voip as any);
