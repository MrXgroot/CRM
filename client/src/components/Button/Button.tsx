import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useLocation } from "react-router-dom";

export const ActionButtonGroup = ({
    onView ,
    onEdit ,
    onDelete,
    onDuplicate,
    onFileView,
    view,
    edit,
    deletee,
    duplicate,
    viewFile,
    revert,
    onRevert
}:{
    onView ?: () => void,
    onEdit ?: () => void,
    onDelete ?: () => void,
    onDuplicate ?: () => void,
    onFileView ?: () => void,
    view ?: boolean,
    edit ?: boolean,
    deletee ?: boolean,
    duplicate ?: boolean,
    viewFile ?:boolean,
    revert ?: boolean,
    onRevert ?: () => void
}) => {
    const { pageAccess} = useAuth();
    const location = useLocation();
    // const [active,setActive]=useState(false);

    // useEffect(() => {
    //    const acessObj = pageAccess.filter(_ => (_.url == location.pathname))[0]
    //     if(acessObj && (acessObj.access_to_delete==1 || acessObj.access_to_update==1)){
    //         setActive(true)
    //     }else {
    //         setActive(false)
    //     }
    // }, [])
    // const accessObj = pageAccess.find(_ => _.url === location.pathname) ;
    // const [state, setState] = useState({
    //     active: false,
    //     EditActive: false,
    //     DeleteActive: false,
    //     AddPayment: false,
    //   });
      const accessObj = pageAccess.find((obj) => obj.url === location.pathname);
      // useEffect(() => {
      //   const accessObj = pageAccess.find((obj) => obj.url === location.pathname);
      //   const newState = {
      //     active: accessObj?.access_to_update === 1 || accessObj?.access_to_delete === 1,
      //     EditActive: accessObj?.access_to_update === 1,
      //     DeleteActive: accessObj?.access_to_delete === 1,
      //     AddPayment: accessObj?.access_to_update ===1,
      //   };
      // setState(newState)
      //   setState((prevState) => {
      //     if (JSON.stringify(prevState) !== JSON.stringify(newState)) {
      //       return newState;
      //     }
      //     return prevState;
      //   });
      // }, [pageAccess, location.pathname]);
    return (
      <>
        <span className=" mt-auto inline-flex items-start overflow-hidden bg-white border rounded shadow-sm ">
          {view && (
            <button
              type="button"
              onClick={() => {
                onView && onView();
              }}
              className="inline-block px-1 py-1 text-gray-700 border-e hover:bg-gray-50 focus:relative"
              title="View"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          )}
          {edit && (
            <button
              type="button"
              title="Edit"
              disabled={!accessObj?.access_to_update}
              onClick={() => {
                // if (state.EditActive) onEdit && onEdit();
                if (accessObj?.access_to_update) onEdit && onEdit(); //ANOTHER METHOD

              }}
              className={`inline-block border-e py-1 px-1 focus:relative ${
                accessObj?.access_to_update
                  ? "text-cyan-700 hover:bg-gray-50"
                  : "bg-gray-300 text-gray-400 border-gray-300"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                />
              </svg>
            </button>
          )}
          {deletee && (
            <button
              type="button"
              disabled={!accessObj?.access_to_delete}
              onClick={() => {
                // if (state.DeleteActive) onDelete && onDelete();
                if (accessObj?.access_to_delete) onDelete && onDelete();
              }}
              // className="inline-block p-3 text-red-700 hover:bg-gray-50 focus:relative disabled:bg-gray-300 disabled:text-gray-400 disabled:border-gray-300"
              title="Delete"
              className={`inline-block p-1 focus:relative ${
                accessObj?.access_to_delete
                  ? "text-red-700 hover:bg-gray-50"
                  : "bg-gray-300 text-gray-400 border-gray-300"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                />
              </svg>
            </button>
          )}

          {duplicate && (
            <button
              type="button"
              onClick={() => {
                onDuplicate && onDuplicate();
              }}
              className="inline-block p-1 text-red-700 hover:bg-gray-50 focus:relative"
              title="Duplicate"
            >
              <svg
                style={{ opacity: ".7" }}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 256 256"
                id="IconChangeColor"
                height="18"
                width="18"
              >
                <rect width="256" height="256" fill="none"></rect>
                <polyline
                  points="168 168 216 168 216 40 88 40 88 88"
                  fill="none"
                  stroke="#000"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="12"
                ></polyline>
                <rect
                  x="40"
                  y="88"
                  width="128"
                  height="128"
                  fill="none"
                  stroke="#000"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="12"
                ></rect>
              </svg>
            </button>
          )}
          {viewFile && (
            <button
              type="button"
              title="View File"
              onClick={() => {
                onFileView && onFileView();
              }}
              className={`inline-block border-e py-2 px-2 focus:relative text-cyan-700 hover:bg-gray-50`}
            >
              <svg width="20" height="20" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M3.5 2C3.22386 2 3 2.22386 3 2.5V12.5C3 12.7761 3.22386 13 3.5 13H11.5C11.7761 13 12 12.7761 12 12.5V6H8.5C8.22386 6 8 5.77614 8 5.5V2H3.5ZM9 2.70711L11.2929 5H9V2.70711ZM2 2.5C2 1.67157 2.67157 1 3.5 1H8.5C8.63261 1 8.75979 1.05268 8.85355 1.14645L12.8536 5.14645C12.9473 5.24021 13 5.36739 13 5.5V12.5C13 13.3284 12.3284 14 11.5 14H3.5C2.67157 14 2 13.3284 2 12.5V2.5Z"
                  fill="#000000"
                />
              </svg>
            </button>
          )}
          {revert && (
            <button
              type="button"
              onClick={() => {
                onRevert && onRevert();
              }}
              className="inline-block p-1 text-orange-600 hover:bg-gray-50 focus:relative border-e"
              title="Revert Transaction"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
                />
              </svg>
            </button>
          )}
        </span>
      </>
    );
};

export const AddButton = ({
    children,
    onClick,
    varient
}: {
    children: string;
    onClick?: () => void;
    varient?: 'blue' | 'light' | 'red' | 'green';
}) => {
    const { pageAccess} = useAuth();
    const location = useLocation();
    const [active,setActive]=useState(()=>{
        const acessObj=pageAccess.find(_=>_.url==location.pathname);
        return acessObj && (acessObj.access_to_add==1)
    });
    useEffect(() => {
       const acessObj = pageAccess.filter(_ => (_.url == location.pathname))[0]
        if(acessObj && acessObj.access_to_add && acessObj.access_to_add == 1){
            setActive(true);
        }else {
            setActive(false);
        }
    }, [pageAccess,location.pathname])
    
    return (
      <>
        <button
          disabled={!active}
          onClick={onClick}
          className={`${
            varient === "green"
              ? `inline-flex items-center gap-2 rounded border border-green-900 bg-green-900 px-4 py-2 text-white hover:bg-transparent hover:text-green-900 focus:outline-none focus:ring active:text-green-500 mx-2 my-2 disabled:bg-gray-300 disabled:text-gray-400 disabled:border-gray-300`
              : `inline-flex items-center gap-2 rounded border border-purple-900 bg-purple-900 px-4 py-2 text-white hover:bg-transparent hover:text-purple-900 focus:outline-none focus:ring active:text-purple-500 mx-2 my-2 disabled:bg-gray-300 disabled:text-gray-400 disabled:border-gray-300`
          }
    `}
        >
          <span className="text-sm font-medium">{children}</span>
          <i className="fa-solid fa-plus"></i>
        </button>
      </>
    );
};

export const FilterButton = ({
    onClick,
}: {
    onClick?: () => void;
}) => {
    return (
        <>
            <button
                onClick={onClick}
                className="inline-flex items-center text-sm gap-2 px-3 py-2 mx-2 my-3 text-white bg-purple-700 border border-purple-700 rounded hover:bg-transparent hover:text-purple-700 focus:outline-none focus:ring active:text-purple-500"
            >
                <span className="text-sm font-medium">Filter</span>
                <i className="fa-solid fa-filter"></i>
            </button>
        </>
    );
};

export const FilterResetButton = ({
    onClick,
    type
}: {
    onClick?: () => void;
    type ?: "button" | "submit" | "reset" | undefined;
}) => {
    return (
        <>
            <button
                onClick={onClick}
                type = {type}
                className="inline-flex items-center gap-2 px-4 py-2 mx-2 my-3 text-sm text-white bg-gray-700 border border-gray-700 rounded hover:bg-transparent hover:text-gray-700 focus:outline-none focus:ring active:text-purple-500"
            >
                <span className="text-sm font-medium">Reset</span>
                <i className="fa-solid fa-filter-circle-xmark"></i>
            </button>
        </>
    );
};

export const UploadExcell = ({ onClick }: { onClick?: () => void }) => {
    return (
        <>
            <button
                onClick={onClick}
                className="inline-flex items-center gap-2 px-6 py-3 mx-2 my-3 text-green-600 border border-green-600 rounded hover:bg-green-600 hover:text-white focus:outline-none focus:ring active:bg-green-500"
            >
                <span className="text-sm font-medium"> Upload Excell </span>
                <i className="fa-solid fa-file-csv"></i>
            </button>
        </>
    );
};

// export const ExportExcell = ({filename , urlPath}:{filename : string; urlPath : string;}) => {
//     return (
//         <>
//             <button
//                 onClick={async ()=>{
//                     const data = await axios.get('http://localhost:5000' + urlPath);
//                     downloadCSV(data.data , filename);
//                   }}
//                 className="inline-flex items-center gap-2 px-6 py-3 mx-2 my-3 text-violet-700 border border-violet-700 rounded hover:bg-violet-700 hover:text-white focus:outline-none focus:ring active:bg-violet-700"
//             >
//                 <span className="text-sm font-medium"> Export Excell </span>
//                 <i className="fa-solid fa-file-csv"></i>
//             </button>
//         </>
//     );
// };

export const ExportExcell = ({ onClick }: {onClick?: () => void;}) => {
  const { pageAccess} = useAuth();
  const location = useLocation();
  const accessObj = pageAccess.find((obj) => obj.url == location.pathname);

  return (
      <>
          <button
              disabled={!accessObj?.access_to_export}
              onClick={()=>{ if (accessObj?.access_to_export) onClick && onClick()}}
              // className="inline-flex items-center gap-2 px-6 py-3 mx-2 my-3  text-green-700 border border-green-700 rounded hover:bg-green-700 hover:text-white focus:outline-none focus:ring active:bg-green-700"
              className={`inline-flex items-center gap-2 px-6 py-3 mx-2 my-3 ${
                accessObj?.access_to_export
                  ? "text-green-700 border border-green-700 rounded hover:bg-green-700 hover:text-white focus:outline-none focus:ring active:bg-green-700"
                  : "bg-gray-300 text-gray-400 border-gray-300 rounded"
              }`}
          >
              <span className="text-sm font-medium"> Export Excell </span>
              <i className="fa-solid fa-file-csv"></i>
          </button>
      </>
  );
};

export const PrintPDF = ({ onClick }: {onClick?: () => void;}) => {
  const { pageAccess} = useAuth();
  const location = useLocation();
  const accessObj = pageAccess.find((obj) => obj.url == location.pathname);

  return (
      <>
          <button
              disabled={!accessObj?.access_to_export}
              onClick={()=>{ if (accessObj?.access_to_export) onClick && onClick()}}
              className={`inline-flex items-center gap-2 px-6 py-3 mx-2 my-3 ${
                accessObj?.access_to_export
                  ? "text-red-500 border border-red-500 rounded hover:bg-red-500 hover:text-white focus:outline-none focus:ring active:bg-red-500"
                  : "bg-gray-300 text-gray-400 border-gray-300 rounded"
              }`}
          >
              <span className="text-sm font-medium"> Download PDF </span>
              <i className="fa-solid fa-print"></i>
          </button>
      </>
  );
};

export const DownloadExcell = ({ link }: { link : string }) => {
    return (
        <>
            <a  
                href={link}
                download = 'asdas'
                className="inline-flex items-center gap-2 px-6 py-3 mx-2 my-3 text-violet-700 border border-violet-700 rounded cursor-pointer hover:bg-violet-700 hover:text-white focus:outline-none focus:ring active:bg-violet-700"
            >
                <span className="text-sm font-medium">Download Template</span>
                <i className="fa-solid fa-download"></i>
            </a>
        </>
    );
};

type ButtonColor = | "indigo" | "blue" | "red" | "green" | "yellow" | "purple" | "pink" | "gray" | "emerald" | "teal" | "cyan" | "lime" | "amber" | "orange" | "rose" | "violet" | "sky" | "fuchsia" | "stone" | "slate" | "zinc" | "neutral";
const buttonColors: Record<ButtonColor, string> = {
  indigo: "border-purple-900 bg-purple-900 hover:bg-transparent hover:text-purple-900 active:text-purple-500",
  blue: "border-violet-900 bg-violet-900 hover:bg-transparent hover:text-violet-900 active:text-violet-500",
  red: "border-red-900 bg-red-900 hover:bg-transparent hover:text-red-900 active:text-red-500",
  green: "border-green-900 bg-green-900 hover:bg-transparent hover:text-green-900 active:text-green-500",
  yellow: "border-yellow-600 bg-yellow-600 hover:bg-transparent hover:text-yellow-600 active:text-yellow-500",
  purple: "border-purple-900 bg-purple-900 hover:bg-transparent hover:text-purple-900 active:text-purple-500",
  pink: "border-pink-900 bg-pink-900 hover:bg-transparent hover:text-pink-900 active:text-pink-500",
  gray: "border-gray-900 bg-gray-900 hover:bg-transparent hover:text-gray-900 active:text-gray-500",
  emerald: "border-emerald-900 bg-emerald-900 hover:bg-transparent hover:text-emerald-900 active:text-emerald-500",
  teal: "border-teal-900 bg-teal-900 hover:bg-transparent hover:text-teal-900 active:text-teal-500",
  cyan: "border-cyan-900 bg-cyan-900 hover:bg-transparent hover:text-cyan-900 active:text-cyan-500",
  lime: "border-lime-700 bg-lime-700 hover:bg-transparent hover:text-lime-700 active:text-lime-500",
  amber: "border-amber-700 bg-amber-700 hover:bg-transparent hover:text-amber-700 active:text-amber-500",
  orange: "border-orange-900 bg-orange-900 hover:bg-transparent hover:text-orange-900 active:text-orange-500",
  rose: "border-rose-900 bg-rose-900 hover:bg-transparent hover:text-rose-900 active:text-rose-500",
  violet: "border-violet-900 bg-violet-900 hover:bg-transparent hover:text-violet-900 active:text-violet-500",
  sky: "border-sky-900 bg-sky-900 hover:bg-transparent hover:text-sky-900 active:text-sky-500",
  fuchsia: "border-fuchsia-900 bg-fuchsia-900 hover:bg-transparent hover:text-fuchsia-900 active:text-fuchsia-500",
  stone: "border-stone-900 bg-stone-900 hover:bg-transparent hover:text-stone-900 active:text-stone-500",
  slate: "border-zinc-900 bg-zinc-900 hover:bg-transparent hover:text-zinc-900 active:text-slate-500",
  zinc: "border-zinc-900 bg-zinc-900 hover:bg-transparent hover:text-zinc-900 active:text-zinc-500",
  neutral: "border-neutral-900 bg-neutral-900 hover:bg-transparent hover:text-neutral-900 active:text-neutral-500",
};

export const CustomButton = ({
  children,
  onClick,
  btnColor = "indigo",
  faIcon
}: {
  children: string;
  onClick?: () => void;
  btnColor?: ButtonColor;
  faIcon?: string;
}) => {

  const colorClass = buttonColors[btnColor];

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded border px-4 py-2 text-white mx-2 my-2
      disabled:bg-gray-300 disabled:text-gray-400 disabled:border-gray-300 ${colorClass}`}
    >
      <span className="text-sm font-medium">{children}</span>
      <i className={`fa-solid ${faIcon ?? "fa-plus"}`}></i>
    </button>
  );
};

const Button = ({
    children,
    varient,
    loading,
    onClick,
    type,
    disabled,
    styleClass
}: {
    children: React.ReactNode;
    varient: 'blue' | 'light' | 'red' | 'green';
    loading?: boolean;
    onClick?: () => void;
    type?: "button" | "submit" | "reset" | undefined;
    disabled? : boolean;
    styleClass?: string;
}) => {
    return (
        <button 
                type = {type}
                disabled = {loading || disabled}
                onClick={onClick}
                className={
                    varient === 'blue' ? 
                    `inline-block w-fulll rounded  px-5 py-2 text-center text-sm font-semibold text-white sm:w-auto bg-violet-500 hover:bg-violet-600 hover:text-white disabled:bg-violet-400  mx-2 my-1 ${styleClass}`
                    : varient === 'light' ?
                    `inline-block w-fulll rounded px-5 py-2 text-center text-sm font-semibold text-gray-500  bg-gray-200 hover:bg-gray-300 hover:text-gray-500 sm:w-auto disabled:text-gray-400 disabled:hover:bg-gray-200 mx-2 my-1 ${styleClass}`
                    : varient === 'red' ?
                    `inline-block w-fulll rounded px-5 py-2 text-center text-sm font-semibold text-red-800  bg-red-400 hover:bg-red-500 hover:text-red-800 sm:w-auto disabled:text-red-500 disabled:hover:bg-red-400 mx-2 my-1 ${styleClass}`
                    : varient =='green' ?
                    `inline-block w-fulll rounded px-5 py-2 text-center text-sm font-semibold text-white  bg-green-700 hover:bg-green-800 hover:text-white-800 sm:w-auto disabled:bg-gray-300 mx-2 my-1 ${styleClass}` 
                     :''
                }
            >
                <div className="flex">
                    {
                        loading && 
                        <svg
                            className={`animate-spin -ml-1 mr-3 h-5 w-5 
                            ${varient === 'blue' ? 'text-white' 
                            : varient === 'light' ? 'text-gray'
                            : varient === 'red' ? 'text-white' : 'text-white'} `}
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            ></circle>
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                        </svg>
                    }
                    {children}
                </div>
            </button>
    )
    
    
};

export default Button;

