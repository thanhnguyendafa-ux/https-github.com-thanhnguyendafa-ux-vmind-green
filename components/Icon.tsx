

import * as React from 'react';

interface IconProps {
  name: string;
  className?: string;
}

const icons: { [key: string]: React.ReactNode } = {
  plus: <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />,
  trash: <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.067-2.09 1.02-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />,
  pencil: <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />,
  book: <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6-2.292m0 0v14.25" />,
  x: <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />,
  arrowLeft: <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />,
  arrowRight: <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />,
  brain: <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />,
  check: <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />,
  trophy: <><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9a9.75 9.75 0 1 0 9 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M18.375 10.5c.494.323.96.72 1.378 1.156C21.157 13.5 22.5 15.82 22.5 18.75v.375c0 .621-.504 1.125-1.125 1.125H2.625c-.621 0-1.125-.504-1.125-1.125V18.75c0-2.93 1.343-5.25 2.747-6.094.418-.436.884-.833 1.378-1.156M12 1.5c1.885 0 3.662.52 5.144 1.414a12.016 12.016 0 0 1 2.943 3.928M12 1.5c-1.885 0-3.662.52-5.144 1.414a12.016 12.016 0 0 0-2.943 3.928" /></>,
  clock: <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
  moon: <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />,
  sun: <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-6.364-.386 1.591-1.591M3 12h2.25m.386-6.364 1.591 1.591M12 12a2.25 2.25 0 0 1-2.25-2.25A2.25 2.25 0 0 1 12 7.5s0-4.5 0-4.5 3.375 0 3.375 0A2.25 2.25 0 0 1 12 12Z" />,
  logout: <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3h12" />,
  spinner: <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 11.667 0l3.181-3.183m-4.991-2.691V5.25a2.25 2.25 0 0 0-2.25-2.25h-4.5a2.25 2.25 0 0 0-2.25 2.25v6.096m14.456-3.136A8.25 8.25 0 1 1 5.536 5.536" />,
  "check-circle": <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
  "error-circle": <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
  "file-text": <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />,
  sparkles: <path strokeLinecap="round" strokeLinejoin="round" d="m10.84 21.75.38-1.02a1.875 1.875 0 0 0-1.23-2.62l-1.42-.52a1.875 1.875 0 0 1-1.23-2.62l.38-1.02a1.875 1.875 0 0 0-2.62-1.23l-1.42.52a1.875 1.875 0 0 1-2.62-1.23l.38-1.02a1.875 1.875 0 0 0-2.82-1.03l-1.2.7a1.875 1.875 0 0 1-2.82-1.03l.38-1.02a1.875 1.875 0 0 0-1.23-2.62L.75 9.38a1.875 1.875 0 0 1-1.23-2.62l.38-1.02a1.875 1.875 0 0 0 1.03-2.82l-1.2-.7a1.875 1.875 0 0 1 1.03-2.82l1.2.7a1.875 1.875 0 0 0 2.82-1.03l-.38-1.02a1.875 1.875 0 0 1 2.62-1.23l1.42.52a1.875 1.875 0 0 0 2.62-1.23l-.38-1.02a1.875 1.875 0 0 1 2.82 1.03l1.2.7a1.875 1.875 0 0 0 2.82 1.03l.38 1.02a1.875 1.875 0 0 1 1.23 2.62l1.42.52a1.875 1.875 0 0 0 1.23 2.62l-.38 1.02a1.875 1.875 0 0 1-1.03 2.82l1.2.7a1.875 1.875 0 0 0-1.03 2.82l-1.2-.7a1.875 1.875 0 0 1-2.82 1.03l.38 1.02a1.875 1.875 0 0 0-2.62 1.23l-1.42-.52a1.875 1.875 0 0 1-2.62 1.23l.38 1.02a1.875 1.875 0 0 0 1.23 2.62l1.42.52a1.875 1.875 0 0 1 1.23 2.62l-.38 1.02a1.875 1.875 0 0 0 2.82 1.03l1.2-.7a1.875 1.875 0 0 1 2.82 1.03l-1.2.7a1.875 1.875 0 0 0-2.82 1.03l-.38-1.02a1.875 1.875 0 0 1-2.62-1.23l-1.42.52a1.875 1.875 0 0 0-2.62 1.23l-.38 1.02Z" />,
  'grip-vertical': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 8h.01M10 12h.01M10 16h.01M14 8h.01M14 12h.01M14 16h.01" />,
  'arrow-up': <path strokeLinecap="round" strokeLinejoin="round" d="M12 19.5v-15m0 0l-6.75 6.75M12 4.5l6.75 6.75" />,
  'arrow-down': <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m0 0l6.75-6.75M12 19.5l-6.75-6.75" />,
  'folder': <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.75h16.5m-16.5 0A2.25 2.25 0 011.5 7.5V5.25A2.25 2.25 0 013.75 3h5.25a2.25 2.25 0 011.8.9l.8 1.2H18a2.25 2.25 0 012.25 2.25v.75M3.75 9.75v8.25A2.25 2.25 0 006 20.25h12A2.25 2.25 0 0020.25 18v-8.25" />,
  'dots-horizontal': <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />,
  'arrow-down-tray': <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />,
  'arrow-up-tray': <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />,
  'table-cells': <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 6.375h17.25M3.375 12h17.25m-17.25 5.625h17.25M5.625 3.375v17.25m6-17.25v17.25m6-17.25v17.25" />,
  'credit-card': <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5h15A2.25 2.25 0 0 1 21.75 6.75v10.5A2.25 2.25 0 0 1 19.5 19.5h-15A2.25 2.25 0 0 1 2.25 17.25V6.75A2.25 2.25 0 0 1 4.5 4.5Z" />,
  filter: <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.572a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />,
  play: <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />,
  photo: <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />,
  home: <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />,
  compass: <><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.49-6.671 9.004 9.004 0 0 0-8.49-11.658A9.004 9.004 0 0 0 3.51 14.33M12 21a9.004 9.004 0 0 1-8.49-6.671 9.004 9.004 0 0 1 8.49-11.658A9.004 9.004 0 0 1 20.49 14.33" /><path strokeLinecap="round" strokeLinejoin="round" d="m9 15 3-3 3 3-3 3-3-3Z" /></>,
  cog: <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-1.007 1.11-1.226l.554-.225a2.25 2.25 0 0 1 2.898 1.455l.298 1.191c.29.17.57.359.84.56l1.1-.371a2.25 2.25 0 0 1 2.72 2.72l-.372 1.1a12.06 12.06 0 0 1 0 1.68l.372 1.1a2.25 2.25 0 0 1-2.72 2.72l-1.1-.372a11.956 11.956 0 0 1-.84.56l-.298 1.191a2.25 2.25 0 0 1-2.898 1.455l-.554-.225a2.25 2.25 0 0 1-1.11-1.226 12.01 12.01 0 0 1 0-4.092ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />,
  eye: <><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.432 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></>,
  'circle-outline': <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
  'check-circle-solid': <path fillRule="evenodd" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM9.53 14.03l-4.5-4.5 1.41-1.41 3.09 3.08 7.09-7.08 1.41 1.41l-8.5 8.5z" clipRule="evenodd" />,
  'list-bullet': <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM3.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM3.75 17.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />,
  keyboard: <><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 14.25h8.25" /><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 12.75h.008v.008h-.008v-.008zm3 0h.008v.008h-.008v-.008zm3 0h.008v.008h-.008v-.008zm-6-3h.008v.008H9.75v-.008zm3 0h.008v.008h-.008v-.008zm3 0h.008v.008h-.008v-.008zm-6-3h.008v.008H9.75v-.008zm3 0h.008v.008h-.008v-.008zm3 0h.008v.008h-.008v-.008zM5.25 7.5h13.5c.621 0 1.125.504 1.125 1.125v6c0 .621-.504 1.125-1.125 1.125H5.25c-.621 0-1.125-.504-1.125-1.125v-6c0 .621.504 1.125 1.125-1.125z" /></>,
  'arrows-right-left': <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h18m-7.5-1.5L21 9m0 0L16.5 4.5M21 9H3" />,
  'chevron-down': <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />,
  'chat': <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.76 9.76 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.455.09-.934.09-1.423A8.25 8.25 0 0 1 12 4.5c4.97 0 9 3.694 9 8.25Z" />,
};

const Icon: React.FC<IconProps> = ({ name, className = 'w-6 h-6' }) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      {icons[name] || null}
    </svg>
  );
};

export default Icon;