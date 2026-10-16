import Swal from "sweetalert2";

export const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    }
  });

  export const toastSuccess = Toast.mixin({
    icon: "success"
  })

  export const toastError = Toast.mixin({
    icon: "error"
  })

export const DeleteConfirmation =  Swal.mixin({
    title: "Are you sure?",
    text: "You won't be able to revert this!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Yes, delete it!"
  })

  

//   Toast.fire({
//     icon: "success",
//     title: "Signed in successfully"
//   });