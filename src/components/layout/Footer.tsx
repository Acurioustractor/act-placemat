import { ACT_PROFIT_SHARING, ACT_VALUES } from '../../constants';

/**
 * Application footer component
 * Contains copyright information and ACT values
 */
const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200 py-6 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-center items-center">
        <p className="text-sm text-gray-500">
          &copy; {currentYear} A Curious Tractor. {ACT_PROFIT_SHARING * 100}% of profits flow back to communities.
        </p>
      </div>
    </footer>
  );
};

export default Footer;