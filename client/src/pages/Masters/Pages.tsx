import { useEffect, useState } from "react";
import InputField, { Checkbox } from "../../components/Input/Input";
import useTable from "../../components/Table/Table";
import Button, {
  ActionButtonGroup,
  AddButton,
} from "../../components/Button/Button";
import Modal from "../../components/Modal/Modal";
import { useFormField as useFieldAttributes } from "../../hooks/form";
import { toastError, toastSuccess } from "../../utils/SweetAlert";
import { AddPage, GetPages, SetDefaultHomePage, UpdatePage, requestHandler } from "../../utils/api";
import { useForm } from "react-hook-form";
import { useAuth } from "../../contexts/AuthContext";
import { LocalStorage } from "../../utils";

  class ExtraActions {
    action_name: string | null = null;
    action_desc: string | null = null;
    action_id?: string | null = null;
  }

export class pagesModel {
  page_id: number | null = null;
  page_name: string | null = null;
  name: string | null = null;
  description: string | null = null;
  superadmin_only: 1 | 0 = 0;
  access_for_all: 1 | 0 = 0;
  offline_enabled: 1 | 0 = 0;
  is_default_home?: 1 | 0 = 0;
  extra_actions: ExtraActions[] = [];
}

const Pages = () => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<pagesModel>();
  const getFieldAttributes = useFieldAttributes({ register, errors });


  const {
    register: register1,
    handleSubmit: handleSubmit1,
    watch: watch1,
    formState: { errors: errors1 },
    reset: reset1,
  } = useForm<ExtraActions>();

  const getFieldAttributes1 = useFieldAttributes({
    register: register1,
    errors: errors1,
  });
  const { user, setUser } = useAuth();
  const [dataArray, setdataArray] = useState<pagesModel[]>([]);
  const [action, setaction] = useState<"Add" | "Edit" | "View" | "">("");
  const [modalOpen, setmodalOpen] = useState(false);

  const superadmin_only = watch("superadmin_only");
  const access_for_all = watch("access_for_all");
  const extra_actions = watch('extra_actions');
  const action_name_watch = watch1("action_name");

  // Custom Hook - gives a "table" component and current page number and a function to change the current page
  const { Table } = useTable(() => {});

  // function to get all entity
  function getAllPages() {
    requestHandler(
      async () => {
        return await GetPages();
      },
      (data) => {
        setdataArray(data.data);
      },
      (errorMessage) => {
        toastError.fire({
          title: errorMessage,
        });
      },
    );
  }

  function handleSetDefaultHome(page_name: string | null) {
    if (!page_name) return;
    requestHandler(
      async () => {
        return await SetDefaultHomePage(page_name);
      },
      (data) => {
        toastSuccess.fire({
          title: data.message || "Default home page updated",
        });
        if (user) {
          const updatedUser = { ...user, default_home_page: page_name };
          setUser(updatedUser);
          LocalStorage.set("users", updatedUser);
        }
        getAllPages();
      },
      (errorMessage) => {
        toastError.fire({
          title: errorMessage,
        });
      }
    );
  }

  const onFormSubmit = (formData: pagesModel) => {
    if (action == "Add") {
      requestHandler(
        async () => {
          return await AddPage(formData);
        },
        (data) => {
          if (data.success) {
            toastSuccess.fire({
              title: data.message,
            });
            getAllPages();
            setmodalOpen(false);
          }
        },
        (errorMessage) => {
          toastError.fire({
            title: errorMessage,
          });
        }
      );
    } else if (action == "Edit") {
      requestHandler(
        () => {
          return UpdatePage(formData);
        },
        (data) => {
          toastSuccess.fire({
            title: data.message,
          });
          getAllPages();
          setmodalOpen(false);
        },
        (errorMessage) => {
          toastError.fire({
            title: errorMessage,
          });
        }
      );
    }
  };
  const onFormSubmit1 = (formData: ExtraActions) => {
    if(!formData.action_name ){ toastError.fire({title : 'Please fill action name to add'}); return}
    reset((prev) => {
      return {
        ...prev,
        extra_actions: [
          ...prev.extra_actions,
          {
            action_name: formData?.action_name?.trim() || null,
            action_desc: formData?.action_desc?.trim() || null,
          },
        ],
      }
    })}

  // function to empty the "data" state
  function resetDatastate() {
    reset(new pagesModel());
    reset1(new ExtraActions());
  }

  // function to pass to the modal close button
  // this closes the modal and clears the "data" state
  function modalClose() {
    setmodalOpen(false);
    resetDatastate();
  }

  useEffect(() => {
    getAllPages();
  }, []);
  
  return (
    <div>
      {/* template header */}
      <div className="mx-3 my-3 shadow px-4 py-1 border rounded ">
        {/* ===== Head ===== */}
        <div className="flex items-center justify-between flex-wrap">
          <div>
            <h2 className="text-2xl font-medium text-cyan-950 pl-2 mt-3 lg:mt-0 py-5">
              Pages Master
            </h2>
          </div>
          <div className="flex justify-start lg:justify-end flex-wrap">
            <AddButton
              onClick={() => {
                setaction("Add");
                resetDatastate();
                setmodalOpen(true);
              }}
            >
              Add Page
            </AddButton>
          </div>
        </div>
      </div>
      {/* ===== Table ===== */}
      <Table>
        <thead>
          <tr>
            <th>Sl</th>
            <th>Path</th>
            <th>Name</th>
            <th>Description</th>
            <th>For super admin only</th>
            <th>Default Home</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
        {dataArray.map((page, index) => {
              return (
                <tr key={page.page_id || index}>
                  <td>{index + 1}</td>
                  <td title={String(page.page_id)}>
                  <b> {page.page_name}</b>
                  </td>
                  <td>{page.name}</td>
                  <td>{page.description}</td>
                  <td>
                    {page.superadmin_only ? (
                      <span className="inline-flex items-center justify-center rounded-full bg-green-200 px-2.5 py-0.5 text-black-700">
                        <p className="whitespace-nowrap text-sm">Yes</p>
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center rounded-full bg-red-200 px-2.5 py-0.5 text-black-700">
                        <p className="whitespace-nowrap text-sm">No</p>
                      </span>
                    )}
                  </td>
                  <td>
                    {page.is_default_home ? (
                      <span className="inline-flex items-center justify-center rounded-full bg-violet-100 text-violet-800 border border-violet-300 px-3 py-1 font-semibold text-xs shadow-sm">
                        <i className="fa-solid fa-house mr-1.5 text-violet-600"></i> Default Home
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetDefaultHome(page.page_name)}
                        className="text-xs bg-white hover:bg-violet-600 hover:text-white text-gray-700 font-medium py-1 px-3 rounded-full border border-gray-300 transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                      >
                        <i className="fa-regular fa-star text-gray-400"></i> Set Default
                      </button>
                    )}
                  </td>
                  <td width={"15%"}>
                    <ActionButtonGroup
                      onView={() => {
                        setaction("View");
                        reset(page);
                        setmodalOpen(true);
                      }}
                      onEdit={() => {
                        setaction("Edit");
                        reset(page);
                        setmodalOpen(true);
                      }}
                      view
                      edit
                    />
                  </td>
                </tr>
              );
            })}
        </tbody>
      </Table>

      {/* Modal for Add , Edit and View */}
      {modalOpen && (
        <Modal heading={`${action} Page`} onClose={modalClose}>
          <form noValidate onSubmit={handleSubmit(onFormSubmit)}>
            <fieldset disabled={action === "View"}>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4">
                <InputField
                  label="Path"
                  placeholder="/profile"
                  {...getFieldAttributes("page_name", {
                    required: "Page path is required ",
                  })}
                />
                <InputField
                  label="Page name"
                  placeholder="Profile"
                  {...getFieldAttributes("name", {
                    required: "Page name is required",
                  })}
                />
                <InputField
                  label="Description"
                  placeholder="Profile Page"
                  {...getFieldAttributes("description", {
                    required: "Description is required",
                  })}
                  styleClass="col-span-1 md:col-span-2"
                />
                <Checkbox
                  {...getFieldAttributes("superadmin_only", {
                    onchange: () => {
                      reset((prev) => ({
                        ...prev,
                        superadmin_only: prev.superadmin_only == 1 ? 0 : 1,
                        access_for_all: 0,
                      }));
                    },
                  })}
                  checked={superadmin_only}
                  label="For super admin only"
                />
                <Checkbox
                  {...getFieldAttributes("access_for_all", {
                    onchange: () => {
                      reset((prev) => ({
                        ...prev,
                        access_for_all: prev.access_for_all == 1 ? 0 : 1,
                        superadmin_only: 0,
                      }));
                    },
                  })}
                  checked={access_for_all}
                  label="Access for everyone (No permission required)"
                />
                <Checkbox
                  {...getFieldAttributes("offline_enabled", {
                    onchange: () => {
                      reset((prev) => ({
                        ...prev,
                        offline_enabled: prev.offline_enabled == 1 ? 0 : 1,
                      }));
                    },
                  })}
                  checked={watch("offline_enabled")}
                  label="Enable offline functionality"
                />
                <div className="col-span-full my-7 flex items-center">
                  <hr className="flex-grow border-gray-400" />
                  <span className="px-4 text-gray-600">
                    Extra action for page
                  </span>
                  <hr className="flex-grow border-gray-400" />
                </div>
                    <div id="partnerForm" className="col-span-1 md:col-span-3 lg:grid-cols-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4">
                      <InputField
                        label="Action name"
                        placeholder="access_to_payment"
                        {...getFieldAttributes1("action_name", {
                          validate: (value: string) => {
                            if (!value) return true;
                            const regex = /^[a-zA-Z_]+$/;
                            return regex.test(value) ? true : "Please use only letters and underscores";
                          },
                        })}
                      />
                      <InputField
                        label="Action description"
                        placeholder="Access to payement "
                        {...getFieldAttributes1("action_desc", {
                          validate: (value: string) =>
                            action_name_watch
                              ? value
                                ? true
                                : "Description is required"
                              : true,
                        })}
                      />
                    </div>
                  </div>
                  <div className="flex justify-start lg:justify-end flex-wrap">
                    <button
                      disabled={action == "View"}
                      onClick={(e) => {
                        e.preventDefault();
                        handleSubmit1(onFormSubmit1)();
                      }}
                      className="inline-flex justify-end  gap-2 mr-5 mb-10 rounded border border-green-900 bg-green-800 px-6 py-2 text-white hover:bg-transparent hover:text-green-900 focus:outline-none hover:focus:ring active:text-purple-500 right-1 my-3"
                    >
                      Add
                    </button>
                  </div>
              </div>
              <Table>
                <thead>
                  <tr >
                    <th>Sl</th>
                    <th>Action name</th>
                    <th>Action description</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {extra_actions.map((_, index) => {
                    return (
                      <tr key={index}>
                        <td>{index + 1}</td>
                        <td>{_.action_name}</td>
                        <td>{_.action_desc}</td>
                        <td width={"15%"}>
                          <ActionButtonGroup 
                          onDelete={()=>{
                            reset((prev)=>({
                              ...prev,
                                extra_actions:prev.extra_actions.filter((_,i:number)=>i!==index)
                            }))
                          }}
                          deletee />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </fieldset>
            <hr className="mt-4 border-gray-300 " />
            <div className="flex justify-end">
              <Button onClick={modalClose} varient="light" type="button">
                Cancel
              </Button>
              <Button varient="blue">Submit</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Pages;

