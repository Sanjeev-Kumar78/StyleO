import { Link } from "react-router";
import "../styles/NavBar.css";

const NavBar = () => {
  return (
    <nav className="w-[100vw] h-16 bg-blue-300 flex flex-row">
      <ul className="flex flex-row items-center p-5">
        <li>
          <Link to="/">Home</Link>
        </li>
        <li>
          <Link to="/login">Login</Link>
        </li>
        <li>
          <Link to="/about">About</Link>
        </li>
        <li>
          <Link to="/contact">Contact</Link>
        </li>
      </ul>
    </nav>
  );
};
export default NavBar;
