import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { 
  UserCircleIcon, 
  ChevronDownIcon
} from '@heroicons/react/24/outline';

const Header = ({ user, title }) => {
  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 lg:px-8 sticky top-0 z-30">
      <div className="flex items-center">
        <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
      </div>

      <div className="flex items-center space-x-4">


        <div className="h-8 w-px bg-gray-200 mx-2"></div>

        <div className="flex items-center space-x-3">
          <div className="text-right hidden md:block">
            <p className="text-sm font-medium text-gray-900">{user.role}</p>
            <p className="text-xs text-gray-500">{user.organizationName}</p>
          </div>
          
          <Menu as="div" className="relative ml-3">
            <div>
              <Menu.Button className="flex items-center max-w-xs text-sm bg-white rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <span className="sr-only">Open user menu</span>
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <UserCircleIcon className="h-6 w-6" />
                </div>
              </Menu.Button>
            </div>
          </Menu>
        </div>
      </div>
    </header>
  );
};

export default Header;
