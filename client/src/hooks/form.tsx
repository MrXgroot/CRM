import React from 'react';

import { UseFormRegister, FieldValues, FieldErrors, Path } from 'react-hook-form';

interface UseFormFieldProps<T extends FieldValues> {
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
}

export const useFormField = <T extends FieldValues>({ register, errors }: UseFormFieldProps<T>) => {
  return (name: Path<T>, validation ?: Record<string, any>) => {
    const required = validation?.required !== undefined;
    return {
      register: register(name, validation),
      error: !!errors[name],
      errorMessage: errors[name]?.message || '',
      required
    }
  };
};

export function useOnInputState<T>(data: T, setData: React.Dispatch<React.SetStateAction<T>>) {
  return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (e.currentTarget) {
      
      const name = e.target.name;
      const value = e.target.value;

      const type = e.target.type;
      if (type === 'number') {
        setData({ ...data, [name]: Number(value) });
      } else if (type === 'checkbox' && e.target instanceof HTMLInputElement) {
        setData({ ...data, [name]: e.target.checked });
      } else {
        setData({ ...data, [name]: value });
      }
    }
  };
}

export function useOnSubmit(fn: (e: React.FormEvent<HTMLFormElement>) => void) {
  return (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.currentTarget.classList.add('was-validated-by-ryal');
    if (e.currentTarget.checkValidity()) {
      e.currentTarget.classList.remove('was-validated-by-ryal');
      fn(e);
    }
  };
}

export function useValue<T extends {}>(
  data: T,
  onInput: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void
) {
  return (input: keyof T) => {
    return {
      name: String(input),
      value: String(data[input] != undefined || null ? data[input] : ''),
      onChange: onInput,
    };
  };
}



//==============================OLD CODE FOR FEILDATTRIBUTES OF FORM==============================//

// import React from 'react';

// export function useOnInputState<T>(data: T, setData: React.Dispatch<React.SetStateAction<T>>) {
//   return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
//     if (e.currentTarget) {
      
//       const name = e.target.name;
//       const value = e.target.value;

//       const type = e.target.type;
//       if (type === 'number') {
//         setData({ ...data, [name]: Number(value) });
//       } else if (type === 'checkbox' && e.target instanceof HTMLInputElement) {
//         setData({ ...data, [name]: e.target.checked });
//       } else {
//         setData({ ...data, [name]: value });
//       }
//     }
//   };
// }

// export function useOnSubmit(fn: (e: React.FormEvent<HTMLFormElement>) => void) {
//   return (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
//     e.currentTarget.classList.add('was-validated-by-ryal');
//     if (e.currentTarget.checkValidity()) {
//       e.currentTarget.classList.remove('was-validated-by-ryal');
//       fn(e);
//     }
//   };
// }

// export function useValue<T extends {}>(
//   data: T,
//   onInput: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void
// ) {
//   return (input: keyof T) => {
//     return {
//       name: String(input),
//       value: String(data[input] != undefined || null ? data[input] : ''),
//       onChange: onInput,
//     };
//   };
// }