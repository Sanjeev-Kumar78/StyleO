import { Link } from "react-router";

const NavBar = () => {
    return (
        <nav>
            <ul>
                <Link to="/">Home</Link>
                <Link to="/login">Login</Link>
                <Link to="/about">About</Link>
                <Link to="/contact">Contact</Link>
            </ul>
        </nav>
    );
}
export default NavBar;