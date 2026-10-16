// import React, { ChangeEvent, useEffect, useRef, useState } from 'react';
// import './Input.css'
// import { UseFormRegisterReturn } from 'react-hook-form';


//     interface InputFieldProps {
//       value?: string;
//       label?: string;
//       placeholder?: string;
//       type?: string;
//       onChange?: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
//       name?: string;
//       disabled?:boolean;
//       required?: boolean;
//       styleClass?: string;
//       min?: string | number;
//       max?: number;
//       onFocus  ?:(e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
//       autoComplete?: string;
//       ref1  ?: any 
//       error ?: boolean;
//       errorMessage?: string;
//       register?: UseFormRegisterReturn;

//     }

//     const InputField: React.FC<InputFieldProps> = ({
//       label = '',
//       placeholder = '',
//       type = 'text',
//       name = '',
//       required = false,
//       styleClass = '',
//       disabled=false,
//       onFocus,
//       autoComplete,
//       ref1,
//       error,
//       errorMessage,
//       register

//     }) => {

//   // const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
//   //   const { value } = event.target;
//   //   onChange(value);
//   // };

//   return (
//     <div className={`input-field ${error && 'error'} flex flex-col justify-end flex-wrap relative mx-2 mt-2 ${styleClass} `}>
//     {label &&<label className='w-full' htmlFor={name}>{label}
//     {required && <span style={{color:'red'}}>*</span>}</label> }
//     {type === 'textarea' ? (
//       <>
//         <textarea
//           className="h-12 w-full rounded border border-gray-400  px-4 py-3 pe-2 text-sm shadow-sm"
//           placeholder={placeholder}
//           // value={value}
//           // onChange={onChange}
//           // required = {required}
//           // name={name}
//           // id={name}
//           {...register}
//         />
//         <span className='text-[10px] text-red-400 min-h-[15px]  ml-1'>{error ? errorMessage : ''}</span>
//       </>
      
//     ) : (
//       <>
//         <input
//           type={type}
//           // value={value}
//           className="h-12 w-full rounded border border-gray-400  px-4 py-3 pe-2 text-sm shadow-sm "
//           placeholder={placeholder}
//           // onChange={onChange}
//           // required = {required}
//           // name={name}
//           // id={name}
//           // min = {min}
//           disabled={disabled}
//           // ref = {ref}
//           ref={ref1}
//           onFocus={onFocus}
//           // max={max}
//           autoComplete={autoComplete ? autoComplete : ''}
//           {...register}
//         />
//         <i className="hidden error_icon absolute right-2 bottom-4 text-red-300 fa-solid fa-circle-exclamation pointer-events-none"></i>
//         <span className='text-[10px] text-red-400 min-h-[15px]  ml-1'>{error ? errorMessage : ''}</span>
//       </>
//     )}
//   </div>
//   );
// };


// interface SearchInputProps extends InputFieldProps {
//   onSearch ?: () => void;
//   onFocus ?: () => void;
//   onBlur ?: () => void;
//   onKeyDown ?: (e : any) => void;
//   autoComplete ?: string;
//   ShowButton ?: boolean;
// }

// export const SearchInput: React.FC<SearchInputProps> = ({
//   value = '',
//   placeholder = '',
//   type = 'text',
//   onChange,
//   name,
//   styleClass = '',
//   onSearch = () => {},
//   onFocus = () => {},
//   onBlur = () => {},
//   onKeyDown = () => {},
//   autoComplete = '',
//   ShowButton = true
// }) => {
//   const [inputValue, setInputValue] = useState(value);
//   const [isSearching, setIsSearching] = useState(true);
//   const prevInputValueRef = useRef('');//new 31-07

//   const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
//     const { value } = event.target;
//     setInputValue(value);
//     if(onChange) {
//       onChange(event);
//     }
//     //new 31-07
//     if (prevInputValueRef.current.length < value.length) {
//       setIsSearching(true);
//     } else if (value === '') {
//       setIsSearching(true);
//     }
//   };

//   const handleSearchClick = () => {
//     if (isSearching) {
//       onSearch();
//     } else {
//       setInputValue('');
//       if(onChange){
//         onChange({ target: { value: '', name } } as ChangeEvent<HTMLInputElement>);
//       }
//     }
//     setIsSearching(!isSearching);
//   };

//   useEffect(() => {
//     setInputValue(value);
//   }, [value])
  

//   return (
//     <div className={`inline-block relative w-[300px] mx-2 my-3 ${styleClass}`}>
//       <input
//         value={inputValue}
//         type={type}
//         id="Search"
//         placeholder={placeholder}
//         name={name}
//         onChange={handleInputChange}
//         className="w-full rounded-md border border-gray-400 py-3 pl-3 pr-10 shadow-sm sm:text-sm"
//         onFocus={onFocus}
//         onBlur={onBlur}
//         onKeyDown={onKeyDown}
//         autoComplete = {autoComplete ? autoComplete : ''}
//       />

//       {
//         ShowButton && 
//         <span className="absolute inset-y-0 end-0 grid w-10 place-content-center">
//           <button type="button" className="text-gray-600 hover:text-gray-700" onClick={handleSearchClick} title={isSearching ? 'Search' : 'Clear'}>
//             <div className="bg-gray-200 px-2 py-2.5 rounded hover:bg-gray-300">
//               {isSearching ? (
//                 <svg
//                   xmlns="http://www.w3.org/2000/svg"
//                   fill="none"
//                   viewBox="0 0 24 24"
//                   strokeWidth="1.5"
//                   stroke="currentColor"
//                   className="h-4 w-4"
//                 >
//                   <path
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                     d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
//                   />
//                 </svg>
//               ) : (
//                 <svg
//                   xmlns="http://www.w3.org/2000/svg"
//                   fill="none"
//                   viewBox="0 0 24 24"
//                   strokeWidth="1.5"
//                   stroke="currentColor"
//                   className="h-4 w-4"
//                 >
//                   <path
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                     d="M6 18L18 6M6 6l12 12"
//                   />
//                 </svg>
//               )}
//             </div>
//           </button>
//         </span>
//       }
//     </div>
//   );
// };


// export const Checkbox = ({
//   label,
//   // onChange,
//   // name,
//   required,
//   // checked,
//   error,
//   errorMessage,
//   register
// }:{
//   label ?: string;
//   name ?: string;
//   required ?: boolean;
//   onChange ?: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
//   checked ?: 1 | 0;
//   error ?: boolean;
//   errorMessage?: string;
//   register ?: UseFormRegisterReturn;
// }) => {
//   return (
//       <div
//           className={`select-field checkbox-field ${error && 'error'} flex flex-col justify-end flex-wrap  mx-2 mt-2`}
//       >
//           <label className="flex cursor-pointer items-start gap-4">
//               <div className="flex items-center">
//                   &#8203;
//                   <input
//                       // name={name}
//                       required={required}
//                       // onChange={onChange}
//                       type="checkbox"
//                       // checked={checked == 1 ? true : false}
//                       className="size-4 rounded border-gray-300"
//                       {...register}
//                   />
//               </div>
//               <div>
//                   <strong className="font-normal text-sm text-gray-900">
//                       {label}
//                   </strong>
//               </div>
//           </label>
//           <span className='text-[10px] text-red-400 min-h-[15px] mt-2 ml-1'>{error ? errorMessage : ''}</span>
//       </div>
//   );
// }




// type AcceptType = 
//   // Image files
//   | "image/*" 
//   | ".jpg" 
//   | ".jpeg" 
//   | ".png" 
//   | ".gif" 
//   | ".bmp" 
//   | ".svg" 
//   | ".webp"
  
//   // Document files
//   | ".pdf" 
//   | ".doc" 
//   | ".docx" 
//   | ".odt" 
//   | ".rtf" 
//   | ".txt"
  
//   // Spreadsheet files
//   | ".csv" 
//   | ".xls" 
//   | ".xlsx"
  
//   // Video files
//   | "video/*" 
//   | ".mp4" 
//   | ".avi" 
//   | ".mov" 
//   | ".wmv" 
//   | ".mkv" 
//   | ".webm"
  
//   // Audio files
//   | "audio/*" 
//   | ".mp3" 
//   | ".wav" 
//   | ".ogg" 
//   | ".m4a" 
//   | ".flac"
  
//   // Compressed files
//   | ".zip" 
//   | ".rar" 
//   | ".7z" 
//   | ".tar" 
//   | ".gz"
  
//   // Code and markup files
//   | ".html" 
//   | ".css" 
//   | ".js" 
//   | ".json" 
//   | ".xml"



// export function DragAndDropFileInput({ onFileUpload , file , required , className, fileTypeLable, accept} : { onFileUpload : (file : File) => void; file : File | undefined | null ; required ?: boolean ; className ?: string; fileTypeLable: string, accept : AcceptType | AcceptType[]}) {
//     const [dragging, setDragging] = useState(false);
//     const fileInputRef = useRef<HTMLInputElement | null>(null);
//     const acceptProp = Array.isArray(accept) ? accept.join(",") : accept;

//     const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
//         e.preventDefault();
//         setDragging(true);
//     };

//     const handleDragLeave = () => {
//         setDragging(false);
//     };

//     const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
//         e.preventDefault();
//         setDragging(false);
//         const file = e.dataTransfer.files[0];
//         onFileUpload(file);
//     };

//     const handleButtonClick = () => {
//       if (fileInputRef.current) {
//           fileInputRef.current.click();
//       }
//     };

//     const handleFileChange = (e : React.ChangeEvent<HTMLInputElement>) => {
//       if (e.target.files && e.target.files.length > 0) {
//         const file = e.target.files[0];
//         onFileUpload(file);
//       }
//     };


//     return (
//         <div
//             className={`flex flex-col align-middle justify-between text-center border-2 rounded-md border-dashed border-gray-400 border-spacing-7 drag-drop-area  mx-2 my-3 p-2 ${className} ${dragging ? 'bg-gray-300' : ''}`}
//             onDragOver={handleDragOver}
//             onDragLeave={handleDragLeave}
//             onDrop={handleDrop}
//         >
//             {
//               file && 
//               <p className='text-gray-500 text-sm' >{file.name}</p>
//             }
//             {
//               !file && 
//               <>
//                 <p className='text-gray-500 text-sm'>Drag and drop a {fileTypeLable} here, or click to select one.</p>
//               </> 
//             }
//             <input
//                 type="file"
//                 accept={acceptProp}
//                 ref={fileInputRef}
//                 onChange={handleFileChange}
//                 style={{ display: 'none' }}
//                 required = {required}
//             />
//             <button type='button' className='bg-gray-200 hover:bg-gray-300 p-1 rounded text-sm text-gray-500 border-gray-300 border' onClick={handleButtonClick}>{file ? 'Change' : 'Upload'} File</button>
//         </div>
//     );
// }



// export default InputField;

import React, { ChangeEvent, useEffect, useRef, useState } from "react";
import { UseFormRegisterReturn } from "react-hook-form";
import "./Input.css";

    interface InputFieldProps {
      value?: string;
      label?: string;
      placeholder?: string;
      type?: string;
      onChange?: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
      onBlur?: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
      name?: string;
      disabled?:boolean;
      required?: boolean;
      styleClass?: string;
      min?: string | number;
      max?: string | number;
      onFocus  ?:(e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
      autoComplete?: string;
      ref1  ?: any 
      error ?: boolean;
      errorMessage?: string;
      register?: UseFormRegisterReturn;
      autoFocus ?: boolean;
      step ?: string | number;
      defaultValue?: string;

    }


const InputField: React.FC<InputFieldProps> = ({
  label = "",
  placeholder = "",
  type = "text",
  name = "",
  required = false,
  styleClass = "",
  disabled = false,
  onFocus,
  autoComplete,
  ref1,
  error,
  errorMessage,
  register,
  min,
  max,
  value,
  onChange,
  autoFocus,
  step,
  onBlur,
  defaultValue
}) => {
  // const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  //   const { value } = event.target;
  //   onChange(value);
  // };

  return (
    <div
      className={`input-field ${
        error && "error"
      } flex flex-col justify-end flex-wrap relative mx-2 mt-0 ${styleClass} `}
    >
      {label && (
        <label className="w-full" htmlFor={name}>
          {label}
          {required && <span style={{ color: "red" }}>*</span>}
        </label>
      )}
      {type === "textarea" ? (
        <>
          <textarea
            className="w-full h-12 px-4 py-3 text-sm border border-gray-400 rounded shadow-sm pe-2"
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            defaultValue={defaultValue}
            // required = {required}
            // name={name}
            // id={name}
            {...register}
          />
          <span className="text-[10px] text-red-400 min-h-[10px]  ml-1">
            {error ? errorMessage : ""}
          </span>
        </>
      ) : (
        <>
          <input
            type={type}
            value={value}
            className="w-full h-8 px-1 py-1 text-sm border border-gray-400 rounded shadow-sm pe-2 "
            placeholder={placeholder}
            onChange={onChange}
            onBlur={onBlur}
            // required = {required}
            // name={name}
            // id={name}
            min={min}
            disabled={disabled}
            // ref = {ref}
            ref={ref1}
            onFocus={onFocus}
            max={max}
            autoComplete={autoComplete ? autoComplete : ""}
            {...register}
            autoFocus={autoFocus}
            step={step}
          />
          <i className="absolute hidden text-red-300 pointer-events-none error_icon right-2 bottom-4 fa-solid fa-circle-exclamation"></i>
          <span className="text-[10px] text-red-400 min-h-[10px]  ml-1">
            {error ? errorMessage : ""}
          </span>
        </>
      )}
    </div>
  );
};

interface SearchInputProps extends InputFieldProps {
  onSearch?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyDown?: (e: any) => void;
  autoComplete?: string;
  ShowButton?: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value = "",
  placeholder = "",
  type = "text",
  onChange,
  name,
  styleClass = "",
  onSearch = () => {},
  onFocus = () => {},
  onBlur = () => {},
  onKeyDown = () => {},
  autoComplete = "",
  ShowButton = true,
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [isSearching, setIsSearching] = useState(true);
  const prevInputValueRef = useRef(""); //new 31-07

  const handleInputChange = (
    event: ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { value } = event.target;
    setInputValue(value);
    if (onChange) {
      onChange(event);
    }
    //new 31-07
    if (prevInputValueRef.current.length < value.length) {
      setIsSearching(true);
    } else if (value === "") {
      setIsSearching(true);
    }
  };

  const handleSearchClick = () => {
    if (isSearching) {
      onSearch();
    } else {
      setInputValue("");
      if (onChange) {
        onChange({
          target: { value: "", name },
        } as ChangeEvent<HTMLInputElement>);
      }
    }
    setIsSearching(!isSearching);
  };

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  return (
    <div className={`inline-block relative w-[300px] mx-2 my-3 ${styleClass}`}>
      <input
        value={inputValue}
        type={type}
        id="Search"
        placeholder={placeholder}
        name={name}
        onChange={handleInputChange}
        className="w-full py-3 pl-3 pr-10 border border-gray-400 rounded-md shadow-sm sm:text-sm"
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        autoComplete={autoComplete ? autoComplete : ""}
      />

      {ShowButton && (
        <span className="absolute inset-y-0 grid w-10 end-0 place-content-center">
          <button
            type="button"
            className="text-gray-600 hover:text-gray-700"
            onClick={handleSearchClick}
            title={isSearching ? "Search" : "Clear"}
          >
            <div className="bg-gray-200 px-2 py-2.5 rounded hover:bg-gray-300">
              {isSearching ? (
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
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
              ) : (
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
            </div>
          </button>
        </span>
      )}
    </div>
  );
};

export const Checkbox = ({
  label,
  // onChange,
  // name,
  required,
  // checked,
  error,
  errorMessage,
  register,
}: {
  label?: string;
  name?: string;
  required?: boolean;
  onChange?: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => void;
  checked?: 1 | 0;
  error?: boolean;
  errorMessage?: string;
  register?: UseFormRegisterReturn;
}) => {
  return (
    <div
      className={`select-field checkbox-field ${
        error && "error"
      } flex flex-col justify-end flex-wrap  mx-2 mt-2`}
    >
      <label className="flex items-start gap-4 cursor-pointer">
        <div className="flex items-center">
          &#8203;
          <input
            // name={name}
            required={required}
            // onChange={onChange}
            type="checkbox"
            // checked={checked == 1 ? true : false}
            className="border-gray-300 rounded size-4"
            {...register}
          />
        </div>
        <div>
          <strong className="text-sm font-normal text-gray-900">{label}</strong>
        </div>
      </label>
      <span className="text-[10px] text-red-400 min-h-[15px] mt-2 ml-1">
        {error ? errorMessage : ""}
      </span>
    </div>
  );
};

type AcceptType = 
  // Image files
  | "image/*" 
  | ".jpg" 
  | ".jpeg" 
  | ".png" 
  | ".gif" 
  | ".bmp" 
  | ".svg" 
  | ".webp"
  
  // Document files
  | ".pdf" 
  | ".doc" 
  | ".docx" 
  | ".odt" 
  | ".rtf" 
  | ".txt"
  
  // Spreadsheet files
  | ".csv" 
  | ".xls" 
  | ".xlsx"
  
  // Video files
  | "video/*" 
  | ".mp4" 
  | ".avi" 
  | ".mov" 
  | ".wmv" 
  | ".mkv" 
  | ".webm"
  
  // Audio files
  | "audio/*" 
  | ".mp3" 
  | ".wav" 
  | ".ogg" 
  | ".m4a" 
  | ".flac"
  
  // Compressed files
  | ".zip" 
  | ".rar" 
  | ".7z" 
  | ".tar" 
  | ".gz"
  
  // Code and markup files
  | ".html" 
  | ".css" 
  | ".js" 
  | ".json" 
  | ".xml"



export function DragAndDropFileInput({ onFileUpload , file , required , className, fileTypeLable, accept} : { onFileUpload : (file : File) => void; file : File | undefined | null ; required ?: boolean ; className ?: string; fileTypeLable?: string, accept ?: AcceptType | AcceptType[]}) {
    const [dragging, setDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const acceptProp = Array.isArray(accept) ? accept.join(",") : accept;

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragging(true);
    };

    const handleDragLeave = () => {
        setDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        onFileUpload(file);
    };

    const handleButtonClick = () => {
      if (fileInputRef.current) {
          fileInputRef.current.click();
      }
    };

    const handleFileChange = (e : React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];
        onFileUpload(file);
      }
    };


    return (
        <div
            className={`flex flex-col align-middle justify-between text-center border-2 rounded-md border-dashed border-gray-400 border-spacing-7 drag-drop-area  mx-2 my-3 p-2 ${className} ${dragging ? 'bg-gray-300' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {
              file && 
              <p className='text-sm text-gray-500' >{file.name}</p>
            }
            {
              !file && 
              <>
                <p className='text-sm text-gray-500'>Drag and drop a {fileTypeLable} here, or click to select one.</p>
              </> 
            }
            <input
                type="file"
                accept={acceptProp}
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
                required = {required}
            />
            <button type='button' className='p-1 text-sm text-gray-500 bg-gray-200 border border-gray-300 rounded hover:bg-gray-300' onClick={handleButtonClick}>{file ? 'Change' : 'Upload'} File</button>
        </div>
    );
}



export default InputField;



