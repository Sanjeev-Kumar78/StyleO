import { Link } from "react-router";
import "../styles/NavBar.css";
import ThemeButton from "./ThemeButton";

const NavBar = () => {
  return (
    <nav>
      <ul>
        <li>
          <Link to="/">Home</Link>
        </li>
        <li>
          <Link to="/about">About</Link>
        </li>
        <li>
          <Link to="/contact">Contact</Link>
        </li>
        <li>
          <Link to="/login">Login</Link>
        </li>
        <ThemeButton />
      </ul>
    </nav>
  );
};
export default NavBar;
