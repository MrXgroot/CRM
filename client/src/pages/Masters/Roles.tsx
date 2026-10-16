import { ChangeEvent, useEffect, useState } from "react";
import InputField from "../../components/Input/Input";
import useTable from "../../components/Table/Table";
import Button, { FilterButton, FilterResetButton } from "../../components/Button/Button";
import Modal from "../../components/Modal/Modal";
import { useFormField as useFieldAttributes } from "../../hooks/form";
import { toastError, toastSuccess } from "../../utils/SweetAlert";
import { AddButton, ActionButtonGroup } from "../../components/Button/Button";
import {
  GetPagesForGivingAccess,
  GetRoles,
  getBranchByEntity,
  requestHandler,
} from "../../utils/api";
import { addRoles } from "../../utils/api";
import { updateRoleAccess } from "../../utils/api";
import "../../components/Input/Input.css";
import SelectField from "../../components/Select/Select";
import { useAuth } from "../../contexts/AuthContext";
import { useForm } from "react-hook-form";
import React from "react";

class filterType{
  page:number = 0;
  limit:number =15;
  role_name:string  = '';
}

interface PageAccess {
  page_id: number;
  access_to_add?: number;
  access_to_update?: number;
  access_to_delete?: number;
   access_to_export?: number;
}
class ExtraActions {
  page_id:number | null = null;
  action_name: string | null = null;
  action_desc: string | null = null;
  action_id?: string | null = null;
}

export class rolesModel {
  entity_id: string | null = null;
  entity_name: string | null = null;
  role_id: string | null = null;
  role_name: string | null = null;
  is_superadmin: 1 | 0 = 0;
  is_admin: 1 | 0 = 0;
  is_staff: 1 | 0 = 0;
  is_active: 0 | 1 = 1;
  branch_access?: number[] = [];
  page_access: PageAccess[] = [];
  extra_actions :ExtraActions[]=[];
  cr_by?: number;
  cr_on?: string;
}

export class pagesModel {
  page_id: number | null = null;
  page_name: string | null = null;
  name: string | null = null;
  description: string | null = null;
  superadmin_only: 1 | 0 = 0;
  access_for_all: 1 | 0 = 0;
  access_to_add?: number;
  access_to_update?: number;
  access_to_delete?: number;
  access_to_export?: number;
  extra_actions: ExtraActions[] = [];
  cr_by?: number;
  cr_on?: string;
}

const Roles = () => {
  const { user } = useAuth();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<rolesModel>();
  const [pages, setpages] = useState<pagesModel[]>([]);
  const [dataArray, setdataArray] = useState<rolesModel[]>([]);
  const [allBranches, setAllBranches] = useState<{ branch_id: number; name: string }[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<number[]>([]);
  const [action, setaction] = useState<"Add" | "Edit" | "View" | "">("");
  const [modalOpen, setmodalOpen] = useState(false);

  const getFieldAttributes = useFieldAttributes({ register, errors });
  // const isAdminWatch=watch('is_admin')
  const pageAccessWatch = watch("page_access");
  const extraActionWatch=watch('extra_actions');

  const { Table,page,setPage } = useTable(() => {getAllRoles()});

  // FILTERS
  const DefaultFilterValues = new filterType();
const {
  register: filterRegister,
  handleSubmit: handleFilterSubmit,
  reset: filterReset,
  getValues
} = useForm<filterType>({
  defaultValues: DefaultFilterValues,
});
const getFilterAttributes = useFieldAttributes({
  register: filterRegister,
  errors,
});

  // function to get all entity
  function getAllRoles() {
    const filter = getValues() // GETS THE CURRENT VALUE OF FILTERTYPE
    requestHandler(
      async () => {
        return await GetRoles({...filter ,page:Number(page)});
      },
      (data) => {
        setdataArray(data.data);
      },
      (errorMessage) => {
        toastError.fire({
          title: errorMessage,
        });
      }
    );
  }

  // custom Hook - handles form submission
  // we need to pass a callback function to "useOnSubmit" ,
  // that callback function will be called after validation of the form
  const onFormSubmit = (formData: rolesModel) => {
    if (user?.is_superadmin == 0) {
      formData.is_superadmin = 0;
    }
    if (
      Number(formData.is_admin) +
        Number(formData.is_staff) +
        Number(formData.is_superadmin) <
      1
    ) {
      toastError.fire(`Please select either admin or staff or internee`);
      return;
    }

    if (
      Number(formData.is_admin) +
        Number(formData.is_staff) +
        Number(formData.is_superadmin) >
      1
    ) {
      toastError.fire(
        `A role can either be ${
          user?.is_superadmin == 1 ? "Super admin or" : ""
        } admin or staff or internees.`
      );
    } else {
      if (action == "Add") {
        requestHandler(
          async () => {
            return await addRoles({ ...formData, branch_access: selectedBranches });
          },
          (data) => {
            if (data.success) {
              toastSuccess.fire({
                title: data.message,
              });
              getAllRoles();
              setmodalOpen(false);
            } else {
              toastError.fire({
                title: data.message,
              });
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
          async () => {
            return await updateRoleAccess({ ...formData, branch_access: selectedBranches });
          },
          (data) => {
            if (data.success) {
              toastSuccess.fire({
                title: data.message,
              });
              getAllRoles();
              setmodalOpen(false);
            }
          },
          (errorMessage) => {
            toastError.fire({
              title: errorMessage,
            });
          }
        );
      }
    }
  };

  const onFilterFormSubmit = (formData: filterType) => {
    setPage(0);
    requestHandler(
      async () => {
        return await GetRoles({...formData ,page:Number(page)});
      },
      (data) => {
        setdataArray(data.data);
      },
      (errorMessage) => {
        toastError.fire({
          title: errorMessage,
        });
      }
    );
   
  };
  function resetFilterStates() {
    filterReset(new filterType());
    getAllRoles();
  }

  // function to empty the "data" state
  function resetDatastate() {
    reset(new rolesModel());
    setSelectedBranches([]);
  }

  function modalClose() {
    setmodalOpen(false);
    resetDatastate();
  }

  function getAllPages() {
    requestHandler(
      async () => {
        return await GetPagesForGivingAccess();
      },
      (data) => {
        setpages(data.data);
      },
      (errorMessage) => {
        toastError.fire({
          title: errorMessage,
        });
      }
    );
  }
  useEffect(() => {
    getAllPages();
  }, []);

  useEffect(() => {
    getAllRoles();
    requestHandler(
      async () => await getBranchByEntity(),
      (res) => {
        if (res?.data) {
          setAllBranches(res.data);
        }
      },
      (err) => console.error("Failed to load entity branches:", err)
    );
  }, []);

  useEffect(() => {
    getAllRoles();
    setaction("");
  }, [page]);
  
  useEffect(() => {
  }, [extraActionWatch])
  

  const handlePageAccessCheckboxChange = (pageId: number) => {
    reset((prevState) => {
      const pageIndex = prevState.page_access.findIndex(
        (access) => access.page_id === pageId
      );

      let updatedPageAccess;
      if (pageIndex !== -1) {
        // If the page exists, remove it and reset all access fields
        updatedPageAccess = [...prevState.page_access];
        updatedPageAccess.splice(pageIndex, 1);
      } else {
        const page = pages.find((pag) => pag.page_id === pageId);
        updatedPageAccess = [
          ...prevState.page_access,
          {
            page_id: pageId,
            access_to_add: page?.access_to_add === 1 ? 1 : 0,
            access_to_update: page?.access_to_update === 1 ? 1 : 0,
            access_to_delete: page?.access_to_delete === 1 ? 1 : 0,
            access_to_export: page?.access_to_export == 1 ? 1 : 0,
          },
        ];
      }

      return { ...prevState, page_access: updatedPageAccess };
    });
  };

  const handleCheckboxChange = (pageId: number, field: keyof PageAccess) => {
    reset((prevState) => {
      const pageIndex = prevState.page_access.findIndex(
        (access) => access.page_id === pageId
      );

      let updatedPageAccess;
      if (pageIndex !== -1) {
        updatedPageAccess = [...prevState.page_access];
        updatedPageAccess[pageIndex] = {
          ...updatedPageAccess[pageIndex],
          [field]: updatedPageAccess[pageIndex][field] === 1 ? 0 : 1,
        };
      } else {
        updatedPageAccess = [
          ...prevState.page_access,
          { page_id: pageId, [field]: 1 },
        ];
      }
      return { ...prevState, page_access: updatedPageAccess };
    });
  };

  // Pages shown in the access table (superadmin-only pages are hidden)
  const filteredPages = pages.filter((page) => page.superadmin_only === 0);

  // Whether every visible page has page access selected
  const allPageAccessSelected =
    filteredPages.length > 0 &&
    filteredPages.every((page) =>
      (pageAccessWatch || []).some((access) => access.page_id === page.page_id)
    );

  // Whether every visible page that supports a field has it enabled
  const isAllAccessSelected = (
    field: 'access_to_add' | 'access_to_update' | 'access_to_delete' | 'access_to_export'
  ) => {
    const eligible = filteredPages.filter((page) => page[field] === 1);
    return (
      eligible.length > 0 &&
      eligible.every((page) => {
        const access = (pageAccessWatch || []).find(
          (a) => a.page_id === page.page_id
        );
        return access?.[field] === 1;
      })
    );
  };

  // Select/deselect page access for all visible pages at once
  const handleSelectAllPageAccess = () => {
    reset((prevState) => {
      const kept = prevState.page_access.filter(
        (access) =>
          !filteredPages.some((page) => page.page_id === access.page_id)
      );
      if (allPageAccessSelected) {
        return { ...prevState, page_access: kept };
      }
      const added = filteredPages.map((page) => ({
        page_id: Number(page.page_id),
        access_to_add: page.access_to_add === 1 ? 1 : 0,
        access_to_update: page.access_to_update === 1 ? 1 : 0,
        access_to_delete: page.access_to_delete === 1 ? 1 : 0,
        access_to_export: page.access_to_export == 1 ? 1 : 0,
      }));
      return { ...prevState, page_access: [...kept, ...added] };
    });
  };

  // Select/deselect a single access field (add/edit/delete/export) for all
  // visible pages that support it, at once.
  const handleSelectAllAccessField = (
    field: 'access_to_add' | 'access_to_update' | 'access_to_delete' | 'access_to_export'
  ) => {
    reset((prevState) => {
      const eligible = filteredPages.filter((page) => page[field] === 1);
      const allOn =
        eligible.length > 0 &&
        eligible.every((page) => {
          const access = prevState.page_access.find(
            (a) => a.page_id === page.page_id
          );
          return access?.[field] === 1;
        });
      const target: 0 | 1 = allOn ? 0 : 1;
      const next = prevState.page_access.map((access) => {
        const page = filteredPages.find((p) => p.page_id === access.page_id);
        if (page && page[field] === 1) {
          return { ...access, [field]: target };
        }
        return access;
      });
      if (target === 1) {
        for (const page of eligible) {
          if (!next.some((a) => a.page_id === page.page_id)) {
            next.push({ page_id: Number(page.page_id), [field]: 1 });
          }
        }
      }
      return { ...prevState, page_access: next };
    });
  };

  const handleExtraActionCheckboxChange = (
    pageId: number,
    actionId: string | null,
    action_name:string,
    isChecked: boolean
  ) => {
    console.log(isChecked, pageId, actionId); // Debugging log
    reset((prevState) => {
      const previousExtraActions = prevState.extra_actions.filter(
        (p) => !(p.page_id === pageId && p.action_id === actionId) 
      );

      if(isChecked){
        previousExtraActions.push({
          page_id: pageId,
          action_id: actionId,
          action_name: action_name, // Set this or remove based on your requirements
          action_desc: null, // Set this or remove based on your requirements
        })
      }
  
      return { ...prevState, extra_actions: previousExtraActions };
    });
  };
  
  return (
    <div>
      {/* template header */}
      <div className="px-4 py-1 mx-3 my-3 border rounded shadow ">
        {/* ===== Head ===== */}
        <div className="flex flex-wrap items-center justify-between">
          <div>
            <h2 className="py-5 pl-2 mt-3 text-2xl font-medium text-cyan-950 lg:mt-0">
              Roles
            </h2>
          </div>
          <div className="flex flex-wrap justify-start lg:justify-end">
            <AddButton
              onClick={() => {
                setaction("Add");
                resetDatastate();
                setmodalOpen(true);
              }}
            >
              Add Roles
            </AddButton>
          </div>
        </div>
        <hr className ="my-3 border-gray-300 " />
        <form
          noValidate
          onSubmit={handleFilterSubmit(onFilterFormSubmit)}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-5 items-end">
            <InputField
              {...getFilterAttributes('role_name',{
                onChange:(e:ChangeEvent<HTMLInputElement>)=>{
                  filterReset((prev) => ({ ...prev, role_name: e.target.value }));
                }
              })}
              name="role_name"
              label="Search by role name"
            />
            <InputField
              {...getFilterAttributes('limit',{
                onChange:(e:ChangeEvent<HTMLInputElement>)=>{
                  filterReset((prev) => ({ ...prev, limit: Number(e.target.value) }));
                }
              })}
              label="Page limit"
              name="limit"
              type="number"
              placeholder="Limit"
              min={0}
            />
            <div className="flex ">
                <FilterResetButton
                    type="button"
                    onClick={() => {
                      resetFilterStates();
                        setPage(0);
                    }}
                ></FilterResetButton>
                <FilterButton onClick={() => {}}></FilterButton>
            </div>
          </div>
        </form>
      </div>
      {/* ===== Table ===== */}
      <Table pagination>
        <thead>
          <tr>
            <th>Sl</th>
            <th>Role name</th>
            <th>Role label</th>
            <th>Role active</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {dataArray
            .filter((_) =>
              user?.is_superadmin == 0
                ? _.is_staff == 1 || _.is_admin == 1
                : true
            )
            .map((_, index) => {
              const {limit} = getValues()
              return (
                <tr key={index}>
                  <td>{page*limit+(index + 1)}</td>
                  <td title={_.role_id?.toString()}><b>{_.role_name}</b></td>
                  <td>
                    <p className="flex items-center w-20 justify-center text-[12px] font-medium py-3 px-2 rounded-full text-violet-800 border border-violet-700 h-[15px] mt-1 whitespace-nowrap">
                      {_.is_admin == 1
                        ? "Admin"
                        : _.is_staff == 1
                        ? "Staff"
                        : _.is_superadmin == 1
                        ? "SuperAdmin"
                        : "-"}
                    </p>
                  </td>
                  <td>
                    {_.is_active == 1 ? (
                      <span className="inline-flex items-center justify-center rounded-full bg-green-300 px-2.5 py-0.5 text-black-700">
                        <p className="whitespace-nowrap text-sm">Yes</p>
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center rounded-full bg-orange-300 px-2.5 py-0.5 text-black-700">
                        <p className="whitespace-nowrap text-sm">No</p>
                      </span>
                    )}
                  </td>
                  <td width={"15%"}>
                    <ActionButtonGroup
                      onView={() => {
                        setaction("View");
                        reset({
                          ..._,
                          branch_access: (_.branch_access || []).map(Number),
                        });
                        setSelectedBranches((_.branch_access || []).map(Number));
                        setmodalOpen(true);
                      }}
                      onEdit={() => {
                        setaction("Edit");
                        console.log(_, "on edit click");

                        reset({
                          ..._,
                          branch_access: (_.branch_access || []).map(Number),
                        });
                        setSelectedBranches((_.branch_access || []).map(Number));
                        setmodalOpen(true);
                        window.scrollTo(0, 100);
                      }}
                      onDuplicate={() => {
                        setaction("Add");
                        reset({ ..._, role_name: "", branch_access: [] });
                        setSelectedBranches([]);
                        setmodalOpen(true);
                      }}
                      view
                      edit
                      duplicate
                    />
                  </td>
                </tr>
              );
            })}
        </tbody>
      </Table>

      {/* Modal for Add , Edit and View */}
      {modalOpen && (
        <Modal heading={`${action} Role`} onClose={modalClose}>
          <form noValidate onSubmit={handleSubmit(onFormSubmit)}>
            <fieldset disabled={action == "View"}>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4">
                <InputField
                  label="Role name"
                  placeholder="Admin"
                  {...getFieldAttributes("role_name", {
                    required: "Role name is required",
                  })}
                />
                {user?.is_superadmin == 1 && (
                  <>
                    {/* Super Admin: Show all fields */}
                    <SelectField
                      label="Is super admin"
                      {...getFieldAttributes("is_superadmin", {
                        required: "Is superadmin is required",
                      })}
                    >
                      <option value="0">No</option>
                      <option value="1">Yes</option>
                    </SelectField>
                    <SelectField
                      label="Is admin"
                      {...getFieldAttributes("is_admin", {
                        required: "Is admin is required",
                      })}
                    >
                      <option value="0">No</option>
                      <option value="1">Yes</option>
                    </SelectField>
                    <SelectField
                      label="Is staff"
                      {...getFieldAttributes("is_staff", {
                        required: "Is staff is required",
                      })}
                    >
                      <option value="0">No</option>
                      <option value="1">Yes</option>
                    </SelectField>
                  </>
                )}

                {user?.is_superadmin !== 1 && (
                  <>
                    <SelectField
                      label="Is admin"
                      {...getFieldAttributes("is_admin", {
                        required: "Is admin is required",
                      })}
                    >
                      <option value="0">No</option>
                      <option value="1">Yes</option>
                    </SelectField>
                    <SelectField
                      label="Is staff"
                      {...getFieldAttributes("is_staff", {
                        required: "Is staff is required",
                      })}
                    >
                      <option value="0">No</option>
                      <option value="1">Yes</option>
                    </SelectField>
                  </>
                )}

                {action === "Edit" && (
                  <>
                    <SelectField
                      label="Is active"
                      {...getFieldAttributes("is_active", {
                        required: "Is active is required",
                      })}
                    >
                      <option value="0">No</option>
                      <option value="1">Yes</option>
                    </SelectField>
                  </>
                )}
              </div>

              {Number(watch("is_staff")) === 1 && allBranches.length > 0 && (
                <div className="mt-4 mb-4 p-4 border border-violet-200 rounded-lg bg-violet-50/50">
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    <i className="fa-solid fa-sitemap mr-2 text-violet-600"></i>
                    Branch Access (Select one or more branches for staff role)
                  </label>
                  <div className="flex flex-wrap gap-3 mt-2">
                    {allBranches.map((branch) => {
                      const bId = Number(branch.branch_id);
                      const isChecked = selectedBranches.includes(bId);
                      return (
                        <label
                          key={bId}
                          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border cursor-pointer text-xs font-semibold transition-all select-none ${
                            isChecked
                              ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                              : "bg-white text-gray-700 border-gray-300 hover:border-violet-400"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="hidden"
                            disabled={action === "View"}
                            checked={isChecked}
                            onChange={(e) => {
                              if (action === "View") return;
                              const checked = e.target.checked;
                              setSelectedBranches((prev) =>
                                checked
                                  ? [...prev, bId]
                                  : prev.filter((id) => id !== bId)
                              );
                            }}
                          />
                          <span>{branch.name}</span>
                          {isChecked && <i className="fa-solid fa-check text-xs ml-1"></i>}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* <Checkbox onChange={()=>{setdata(prev => ( {...prev , superadmin_only : prev.superadmin_only  == 1 ? 0 : 1} ))}} checked={data.superadmin_only }   />
              <InputField required label="page Names" placeholder="/profile" {...FieldAttributes('page_name')} /> */}
              {/* {<label className='w-full' htmlFor="app-input-field"><span style={{color:'red'}}>*</span></label> } */}
              <label
                className="grid ml-3 mr-4 mb-9"
                style={{ fontSize: "14.5px" ,fontWeight:'bold' }}
              >
                Accesses to pages
              </label>

              <Table className="accessTable">
                <thead>
                  <tr>
                    <th>Name</th>
                    {user?.is_superadmin === 1 && <th>Description</th>}
                    <th>
                      <div className="flex flex-col items-center gap-1">
                        <span>Page access</span>
                        <input
                          type="checkbox"
                          title="Select all pages"
                          checked={allPageAccessSelected}
                          onChange={handleSelectAllPageAccess}
                        />
                      </div>
                    </th>
                    <th>
                      <div className="flex flex-col items-center gap-1">
                        <span>Access to add</span>
                        <input
                          type="checkbox"
                          title="Select all"
                          checked={isAllAccessSelected('access_to_add')}
                          onChange={() => handleSelectAllAccessField('access_to_add')}
                        />
                      </div>
                    </th>
                    <th>
                      <div className="flex flex-col items-center gap-1">
                        <span>Access to edit</span>
                        <input
                          type="checkbox"
                          title="Select all"
                          checked={isAllAccessSelected('access_to_update')}
                          onChange={() => handleSelectAllAccessField('access_to_update')}
                        />
                      </div>
                    </th>
                    <th>
                      <div className="flex flex-col items-center gap-1">
                        <span>Access to delete</span>
                        <input
                          type="checkbox"
                          title="Select all"
                          checked={isAllAccessSelected('access_to_delete')}
                          onChange={() => handleSelectAllAccessField('access_to_delete')}
                        />
                      </div>
                    </th>
                    <th>
                      <div className="flex flex-col items-center gap-1">
                        <span>Access to export</span>
                        <input
                          type="checkbox"
                          title="Select all"
                          checked={isAllAccessSelected('access_to_export')}
                          onChange={() => handleSelectAllAccessField('access_to_export')}
                        />
                      </div>
                    </th>
                    <th>Extra action button</th>
                  </tr>
                </thead>
                <tbody>
                  {pages
                    .filter((page) => page.superadmin_only === 0)
                    .map((page, pageIdx) => (
                      <tr key={page.page_id ?? `page-${pageIdx}`}>
                        <td>
                          <label className="ml-2">{page.name}</label>
                        </td>
                        {user?.is_superadmin == 1 && (
                          <td>
                            <label className="ml-2">
                              {page.description ? page.description : "-"}
                            </label>
                          </td>
                        )}
                        <td>
                          <div className="grid place-items-center">
                            <input
                              type="checkbox"
                              onChange={() =>
                                handlePageAccessCheckboxChange(
                                  Number(page.page_id)
                                )
                              }
                              checked={pageAccessWatch.some(
                                (access) => access.page_id === page.page_id
                              )}
                            />
                          </div>
                        </td>
                        <td>
                          <div className="grid place-items-center">
                            {page.access_to_add === 1 && (
                              <input
                                type="checkbox"
                                onChange={() =>
                                  handleCheckboxChange(
                                    Number(page.page_id),
                                    "access_to_add"
                                  )
                                }
                                checked={pageAccessWatch.some(
                                  (access) =>
                                    access.page_id === page.page_id &&
                                    access.access_to_add === 1
                                )}
                              />
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="grid place-items-center">
                            {page.access_to_update === 1 && (
                              <input
                                type="checkbox"
                                onChange={() =>
                                  handleCheckboxChange(
                                    Number(page.page_id),
                                    "access_to_update"
                                  )
                                }
                                checked={pageAccessWatch.some(
                                  (access) =>
                                    access.page_id === page.page_id &&
                                    access.access_to_update === 1
                                )}
                              />
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="grid place-items-center">
                            {page.access_to_delete === 1 && (
                              <input
                                type="checkbox"
                                onChange={() =>
                                  handleCheckboxChange(
                                    Number(page.page_id),
                                    "access_to_delete"
                                  )
                                }
                                checked={pageAccessWatch.some(
                                  (access) =>
                                    access.page_id === page.page_id &&
                                    access.access_to_delete === 1
                                )}
                              />
                            )}
                          </div>
                          </td>
                          <td>
                          <div className="grid place-items-center">
                            {page.access_to_export == 1 && (
                              <input
                                type="checkbox"
                                onChange={() =>
                                  handleCheckboxChange(
                                    Number(page.page_id),
                                    "access_to_export"
                                  )
                                }
                                checked={pageAccessWatch.some(
                                  (access) =>
                                    access.page_id == page.page_id &&
                                    access.access_to_export == 1
                                )}
                              />
                            )}
                          </div>
                          </td>
                          <td>
                          <div className="flex">
                            { page.extra_actions.length > 0 ? page.extra_actions.map((action, index) => (
                                <React.Fragment key={index}>
                              <div 
                                key={index} 
                                style={{ 
                                  display: 'flex', 
                                  flexDirection: 'column',  
                                  alignItems: 'center',      
                                  marginRight: '10px'       
                                }}
                              >
                                <label 
                                  htmlFor={`action_name_${index}`} 
                                  style={{ marginBottom: '4px'}} 
                                >
                                  {action.action_desc}
                                </label>
                                
                                <input 
                                  style={{ height: '15px' }} 
                                  type="checkbox" 
                                  id={`action_name_${index}`} 
                                  name="action_name"
                                  onChange={(e) =>{
                                    handleExtraActionCheckboxChange(
                                      page.page_id!,
                                      action.action_id!, // Passing page_id from the page
                                      action.action_name!, // Passing action_name from ExtraActions
                                      e.target.checked // Pass whether the checkbox is checked (true or false)
                                    )
                                  }}
                                  checked={extraActionWatch.some(
                                    (access) =>
                                      access.page_id == page.page_id && access.action_id == action.action_id
                                  )}
                                />
                              </div>
                                {index < page.extra_actions.length - 1 && (
                                <div className="mx-5 border border-gray-300"></div>
                              )}
                            </React.Fragment>
                            )) : <i title='No extra actions' className="fas fa-unlink"></i>}
                          </div>
                        </td>
                      </tr>
                    ))}
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

export default Roles;

