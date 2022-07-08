import { Call, IncomingCall, LocalVideoStream, PropertyChangedEvent, RemoteParticipant, RemoteVideoStream, VideoStreamRenderer, VideoStreamRendererView } from '@azure/communication-calling';
import * as React from 'react';
import { connect } from 'react-redux';
import { Button, Col, Form, FormGroup, Input, Label } from 'reactstrap';
import { ApplicationState } from '../store';
import * as IdentityStore from '../store/Identity';

type VoipProps = IdentityStore.IdentityState & typeof IdentityStore.actionCreators;

interface VoipState {
    call: Call | null,
    calleeId: string | null,
    enableAcceptCallButton: boolean,
    enableStartCallButton: boolean,
    incomingCall: IncomingCall | null,
    localVideoStream: LocalVideoStream | undefined,
    localVideoView: VideoStreamRendererView | null,
    localVideoStreamRenderer: VideoStreamRenderer | null,
    showLocalVideoContainer: boolean,
    remoteVideoView: VideoStreamRendererView | null
}

export class Voip extends React.PureComponent<VoipProps, VoipState> {
    constructor(props: VoipProps) {
        super(props);

        this.state = {
            call: null,
            calleeId: null,
            enableAcceptCallButton: false,
            enableStartCallButton: false,
            incomingCall: null,
            localVideoStream: undefined,
            localVideoView: null,
            localVideoStreamRenderer: null,
            showLocalVideoContainer: false,
            remoteVideoView: null
        };
    }

    public componentDidMount() {
        this.props.callAgent.on('incomingCall', this.incomingCallHandler);

        console.log("Call Agent at end of componentDidMount in Voip.tsx", this.props.callAgent);
    }

    public incomingCallHandler = async (args: { incomingCall: IncomingCall }): Promise<void> => {
        console.log("incomingCallHandler", args.incomingCall);
        try {
            await this.props.deviceManager!.askDevicePermission({ video: true, audio: true });

            this.setState({
                enableAcceptCallButton: true,
                enableStartCallButton: false,
                incomingCall: args.incomingCall
            });
        } catch (error) {
            console.error(error);
        }
    }

    public onChange = (e: any) => this.setState({
        calleeId: e.target.value,
        enableStartCallButton: e.target.value.length === 79
    });

    public createLocalVideoStream = async () => {
        let cameras = await this.props.deviceManager!.getCameras();

        const camera = cameras[0];

        if (camera) {
            return new LocalVideoStream(camera);
        } else {
            console.error(`No camera device found on the system`);
        }
    }

    public startCallButtonOnClick = async (e: any) => {
        try {
            this.props.deviceManager!.askDevicePermission({ video: true, audio: true });

            const localVideoStream = await this.createLocalVideoStream();

            const videoOptions = localVideoStream ? { localVideoStreams: [localVideoStream] } : undefined;

            let call = this.props.callAgent!.startCall([{ communicationUserId: this.state.calleeId!.trim() }], { videoOptions });

            console.log("Started call:", call);

            this.setState({
                call: call,
                localVideoStream: localVideoStream
            }, () => this.subscribeToCall(call)); // Subscribe to the call's properties and events.
        } catch (error) {
            console.error(error);
        }
    }

    public callStateChanged = async (event: PropertyChangedEvent): Promise<void> => {
        console.log(`Call state changed: ${this.state.call?.state}`);
        if (this.state.call?.state === 'Connected') {
            //connectedLabel.hidden = false;
            //acceptCallButton.disabled = true;
            //startCallButton.disabled = true;
            //hangUpCallButton.disabled = false;
            //startVideoButton.disabled = false;
            //stopVideoButton.disabled = false;
            //remoteVideosGallery.hidden = false;
        } else if (this.state.call?.state === 'Disconnected') {
            //connectedLabel.hidden = true;
            //startCallButton.disabled = false;
            //hangUpCallButton.disabled = true;
            //startVideoButton.disabled = true;
            //stopVideoButton.disabled = true;
            console.log(`Call ended, call end reason={code=${this.state.call?.callEndReason?.code}, subCode=${this.state.call?.callEndReason?.subCode}}`);
        }
    }

    public subscribeToCall = (call: Call) => {
        console.log("subscribeToCall", this);
        try {
            // Inspect the initial call.id value.
            console.log(`Call Id: ${call.id}`);

            // Subscribe to call's 'idChanged' event for value changes.
            call.on('idChanged', () => {
                console.log(`Call Id changed: ${call.id}`);
            });

            // Inspect the initial call.state value.
            console.log(`Call state: ${call.state}`);

            // Subscribe to call's 'stateChanged' event for value changes.
            //call.on('stateChanged', this.callStateChanged);

            call.localVideoStreams.forEach(async (lvs: LocalVideoStream) => {
                this.setState({
                    localVideoStream: lvs
                });

                await this.displayLocalVideoStream();
            });

            call.on('localVideoStreamsUpdated', e => {
                e.added.forEach(async lvs => {
                    this.setState({
                        localVideoStream: lvs
                    });

                    await this.displayLocalVideoStream();
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

    public remoteParticipantsUpdated = (e: any) => {
        console.log("remoteParticipantsUpdated", this);
        // Subscribe to new remote participants that are added to the call.
        e.added.forEach((remoteParticipant: RemoteParticipant) => {
            this.subscribeToRemoteParticipant(remoteParticipant)
        });

        // Unsubscribe from participants that are removed from the call
        e.removed.forEach((remoteParticipant: RemoteParticipant) => {
            console.log('Remote participant removed from the call.');
        });
    }

    public subscribeToRemoteParticipant = (remoteParticipant: RemoteParticipant) => {
        console.log("subscribeToRemoteParticipant", this);
        try {
            // Inspect the initial remoteParticipant.state value.
            console.log(`Remote participant state: ${remoteParticipant.state}`);

            // Subscribe to remoteParticipant's 'stateChanged' event for value changes.
            remoteParticipant.on('stateChanged', () => {
                console.log(`Remote participant state changed: ${remoteParticipant.state}`);
            });

            // Inspect the remoteParticipants's current videoStreams and subscribe to them.
            remoteParticipant.videoStreams.forEach((remoteVideoStream: RemoteVideoStream): void => {
                this.subscribeToRemoteVideoStream(remoteVideoStream)
            });

            // Subscribe to the remoteParticipant's 'videoStreamsUpdated' event to be
            // notified when the remoteParticiapant adds new videoStreams and removes video streams.
            remoteParticipant.on('videoStreamsUpdated', e => {
                // Subscribe to new remote participant's video streams that were added.
                e.added.forEach((remoteVideoStream: RemoteVideoStream): void => {
                    this.subscribeToRemoteVideoStream(remoteVideoStream)
                });
                // Unsubscribe from remote participant's video streams that were removed.
                e.removed.forEach((remoteVideoStream: RemoteVideoStream): void => {
                    console.log('Remote participant video stream was removed.');
                })
            });
        } catch (error) {
            console.error(error);
        }
    }

    public subscribeToRemoteVideoStream = async (remoteVideoStream: RemoteVideoStream) => {
        console.log("subscribeToRemoteVideoStream", this);
        let renderer = new VideoStreamRenderer(remoteVideoStream);

        const createView = async () => {
            let view = await renderer.createView();

            this.setState({
                remoteVideoView: view
            });
        }

        // Remote participant has switched video on/off
        remoteVideoStream.on('isAvailableChanged', async () => {
            try {
                if (remoteVideoStream.isAvailable) {
                    await createView();
                } else {
                    //this.state.remoteVideoView.dispose();
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
    }

    public displayLocalVideoStream = async () => {
        console.log("displayLocalVideoStream", this);
        try {
            if (this.state.localVideoStream === null || this.state.localVideoStream === undefined)
                return;

            let localVideoStreamRenderer = new VideoStreamRenderer(this.state.localVideoStream);

            const view = await this.state.localVideoStreamRenderer!.createView();

            this.setState({
                localVideoStreamRenderer: localVideoStreamRenderer,
                //localVideoView: view.target,
                showLocalVideoContainer: true
            });
        } catch (error) {
            console.error(error);
        }
    }

    public removeLocalVideoStream = async () => {
        console.log("removeLocalVideoStream", this);
        try {
            this.state.localVideoStreamRenderer!.dispose();
            this.setState({
                showLocalVideoContainer: false
            });
        } catch (error) {
            console.error(error);
        }
    };

    public render = (): React.ReactNode => {
        let callStatus = this.state.call !== null ? (
            <FormGroup row >
                <Label for="callId" sm={2}>Call ID</Label>
                <Col sm={10}>
                    <Input type="text" name="callId" id="callId" value={this.state.call?.id} readOnly />
                </Col>
                <Label for="callState" sm={2}>Call State</Label>
                <Col sm={10}>
                    <Input type="text" name="callState" id="callState" value={this.state.call?.state} readOnly />
                </Col>
            </FormGroup>) : (<div></div>);

        return (<>
            <h1>Voice over Internet Protocol </h1>
            <Form>
                <FormGroup row >
                    <Label for="callee" sm={2}>Callee</Label>
                    <Col sm={10}>
                        <Input type="text" name="callee" id="callee" placeholder="Recipient ACS ID" onChange={this.onChange} />
                    </Col>
                    <br />

                </FormGroup>
                {callStatus}
            </Form>
            <br />
            <Button disabled={!this.state.enableStartCallButton} onClick={this.startCallButtonOnClick}>Start Call</Button>
            {/*<Button>Hang up Call</Button>*/}
            {/*<Button>Accept Call</Button>*/}
            {/*<Button>Start Video</Button>*/}
            {/*<Button>Stop Video</Button>*/}
            <div className="remote-video-container">{this.state.localVideoView}</div>
            <div className="remote-video-container">{this.state.remoteVideoView}</div>
            <div> {/* remoteVideosGallery */}</div>

        </>);
    }
}

export default connect((state: ApplicationState) => state.identity, IdentityStore.actionCreators)(Voip as any);
