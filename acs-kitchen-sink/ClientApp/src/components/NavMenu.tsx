import * as React from 'react';
import { Clipboard } from "react-bootstrap-icons";
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import { Button, Collapse, Container, Nav, Navbar, NavbarText, NavbarBrand, NavbarToggler, NavItem, NavLink, Spinner } from 'reactstrap';
import { ApplicationState } from '../store';
import * as IdentityStore from '../store/Identity';
import './NavMenu.css';

type IdentityProps = IdentityStore.IdentityState & typeof IdentityStore.actionCreators;



export class NavMenu extends React.PureComponent<IdentityProps> {
    public state = {
        isOpen: false
    };

    public componentDidMount() {
        this.props.requestIdentity();
    }

    public copy = () => {
        if (this.props.identity !== null)
            navigator.clipboard.writeText(this.props.identity.user.id);
    }

    public render() {
        let len = this.props.identity?.user?.id.length || 0;
        let shortId = len > 0 ? <>
            <NavbarText style={{ marginRight: "0.5rem" }}>{this.props.identity?.user?.id.substring(len - 36, len)}</NavbarText>
            <Button outline className="secondary sm" onClick={this.copy}><Clipboard /></Button>
        </> : <></>;

        return (
            <header>
                <Navbar className="navbar-expand-sm navbar-toggleable-sm border-bottom box-shadow mb-3" light>
                    <Container>
                        <NavbarBrand tag={Link} to="/">ACS Kitchen Sink</NavbarBrand>
                        <Nav className="justify-content-end" style={{ width: "100%" }}>
                            {this.props.isLoading ? <Spinner>Loading...</Spinner> : shortId}
                        </Nav>
                        <NavbarToggler onClick={this.toggle} className="mr-2" />
                        <Collapse className="d-sm-inline-flex flex-sm-row-reverse" isOpen={this.state.isOpen} navbar>
                            <ul className="navbar-nav flex-grow">
                                <NavItem>
                                    <NavLink tag={Link} className="text-dark" to="/">Home</NavLink>
                                </NavItem>
                                <NavItem>
                                    <NavLink tag={Link} className="text-dark" to="/voip">VoiP</NavLink>
                                </NavItem>
                                <NavItem>
                                    <NavLink tag={Link} className="text-dark" to="/chat">Chat</NavLink>
                                </NavItem>
                            </ul>
                        </Collapse>
                    </Container>
                </Navbar>
            </header>
        );
    }

    private toggle = () => {
        this.setState({
            isOpen: !this.state.isOpen
        });
    }
}

export default connect(
    (state: ApplicationState) => state.identity, // Selects which state properties are merged into the component's props
    IdentityStore.actionCreators // Selects which action creators are merged into the component's props
)(NavMenu as any);
