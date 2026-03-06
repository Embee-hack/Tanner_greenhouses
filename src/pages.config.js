/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Compare from './pages/Compare';
import CropCycles from './pages/CropCycles';
import Dashboard from './pages/Dashboard';
import Environmental from './pages/Environmental';
import Expenses from './pages/Expenses';
import FarmCalendar from './pages/FarmCalendar';
import GreenhouseDetail from './pages/GreenhouseDetail';
import Greenhouses from './pages/Greenhouses';
import Harvests from './pages/Harvests';
import Incidents from './pages/Incidents';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import Treatments from './pages/Treatments';
import UserManagement from './pages/UserManagement';
import Workers from './pages/Workers';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Compare": Compare,
    "CropCycles": CropCycles,
    "Dashboard": Dashboard,
    "Environmental": Environmental,
    "Expenses": Expenses,
    "FarmCalendar": FarmCalendar,
    "GreenhouseDetail": GreenhouseDetail,
    "Greenhouses": Greenhouses,
    "Harvests": Harvests,
    "Incidents": Incidents,
    "Inventory": Inventory,
    "Sales": Sales,
    "Treatments": Treatments,
    "UserManagement": UserManagement,
    "Workers": Workers,
}

export const pagesConfig = {
    mainPage: "Greenhouses",
    Pages: PAGES,
    Layout: __Layout,
};