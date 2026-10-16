import { ChangeEvent, useEffect, useState } from "react";
import SelectField from "../../components/Select/Select";
import useTable from "../../components/Table/Table";
import Button, {
  ActionButtonGroup,
  AddButton,
  FilterButton,
  FilterResetButton,
} from "../../components/Button/Button";
import Modal from "../../components/Modal/Modal";
import { useFormField as useFieldAttributes } from "../../hooks/form";
import { toastSuccess, toastError } from "../../utils/SweetAlert";
import { addUSer, getAllSalaryStructure, GetAllUsers, getDesignations, requestHandler, ShiftTimeApis } from "../../utils/api";
import profileImg from "../../assets/avatar.svg";
import InputField, { DragAndDropFileInput } from "../../components/Input/Input";
import { getImageUrl } from "../../utils";
import { GetRoles } from "../../utils/api";
import { rolesModel } from "./Roles";
import { UpdateUser } from "../../utils/api";
import { dsignationModel } from "./Designation";
import { useAuth } from "../../contexts/AuthContext";
import { useForm } from "react-hook-form";
import { useMaster } from "../../contexts/MasterContext";
import { useIfscLookup } from "../../hooks/useIfscLookup";

class extras {
  desig_name : string = '';
  branch_name: string | null = null;
  role_name: string | null = null;
}

export class userModel extends extras{
  entity_id: number | null = null;
  user_id: number | null = null;
  user_name: string | null = null;
  user_password: string | null = null;
  role_id: number | null = null;
  full_name: string | null = null;
  branch_id: number | null = null;
  user_active: 1 | 0 = 0;
  desig_id : number | null = null;
  is_admin : 1 | 0 = 0; 
  is_superadmin : 1 | 0 = 0; 
  is_staff : 1 | 0 = 0; 
  imageFile:File | null = null;
  pan_num: string = '';
  uan: string = '';
  esi: string = '';
  shift_code: number | null = null;
  emp_structure_code: string = '';
  reporting_to: string = '';
  joining_date: string = '';
  bank_name: string = '';
  bank_acc_type: string = '';
  bank_acc_num: string = '';
  bank_branch_name: string = '';
  bank_ifsc_code: string = '';
}

export class filterType {
  limit: number = 15;
  page: number = 0;
  user_name: string | null = "";
  role_id:number | null = null;
}

const Users = () => {
  const { register, handleSubmit, watch, formState: { errors }, reset, setValue } = useForm<userModel>();
  const [roles, setRole] = useState<rolesModel[]>([]);
  const [dataArray, setdataArray] = useState<userModel[]>([]);
  const [designationMaster, setdesignationMaster] = useState<dsignationModel[]>([]);
  const [imageurl,setimageUrl]=useState('')
  const [action, setaction] = useState<"Add" | "Edit" | "View" | "">("");
  const [Shifts, setShifts] = useState<any[]>([]);
  const [structureCode, setStructureCode] = useState<{structure_code: string, structure_desc: string}[]>([]);
  const [modalOpen, setmodalOpen] = useState(false);
  const { Table,page,setPage } = useTable(() => {getAllUsers() // Pass page to API
  });
  const { user, branchAccess, currentBranch } = useAuth();
  const { bankName = [], bankAccType = [] } = useMaster();
  const getFieldAttributes = useFieldAttributes({register,errors}) // for main form
  const ImageFilewatch=watch('imageFile')
  const bank_ifsc_code_watch = watch('bank_ifsc_code');

  const { loading: ifscLoading, details: ifscDetails, error: ifscError, verified: ifscVerified } = useIfscLookup(bank_ifsc_code_watch);

  useEffect(() => {
    if (ifscDetails) {
      if (ifscDetails.BRANCH) {
        setValue('bank_branch_name', ifscDetails.BRANCH, { shouldValidate: true });
      }
      if (bankName && bankName.length > 0) {
        const match = bankName.find(
          (b) =>
            b.BANK_CODE?.toLowerCase() === ifscDetails.BANKCODE?.toLowerCase() ||
            b.BANK_DESC?.toLowerCase().includes(ifscDetails.BANK?.toLowerCase()) ||
            ifscDetails.BANK?.toLowerCase().includes(b.BANK_DESC?.toLowerCase())
        );
        if (match) {
          setValue('bank_name', match.BANK_CODE, { shouldValidate: true });
        }
      }
    }
  }, [ifscDetails, bankName, setValue]);
  
  // FOR FILTER 
  const DefaultFilterValues = new filterType()
  const { register:filterRegister,handleSubmit:handleFilterSubmit, reset:filterReset,getValues } = useForm<filterType>({
    defaultValues:DefaultFilterValues
  });
  const getFilterAttributes = useFieldAttributes({register:filterRegister,errors});

  // function to get all entity
  function getAllUsers() {
    const formData=getValues();
    requestHandler(
      async () => {
        return await GetAllUsers({...formData ,page:Number(page)});
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

  // function to get all entity
  function getAllRoles() {
    return requestHandler(
      async () => {
        return await GetRoles();
      },
      (data) => {
        setRole(data.data);
      },
      (errorMessage) => {
        toastError.fire({
          title: errorMessage,
        });
      }
    );
  }

  function getAllDesignations(){
    requestHandler(
      async () => {
          return await getDesignations();
      },
      (data) => {
        setdesignationMaster(data.data)
      },
      (errorMessage)=>{
        toastError.fire({
          title : errorMessage
        })
      }
  );
  }

  function getAllTimeShift() {
    requestHandler(
      async () => {
        return await ShiftTimeApis.GetTimeShift(
        );
      },
      (data) => {
        setShifts(data.data);
      },
      (errorMessage) => {
        toastError.fire({
          title: errorMessage,
        });
      }
    );
  }

  function GetSalaryStructures() {
    requestHandler(
      async () => {
        return await getAllSalaryStructure();
      },
      (data) => {
        setStructureCode(data.data);
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
  const onFormSubmit = (formData : userModel )=>{
    if (action == "Add") {
      if(String(formData?.user_password)?.length < 8){
      toastError.fire({
          title: 'Password should be at least 8 characters',
        });
        return false
      }
      requestHandler(
        async () => {
          return await addUSer(formData);
        },
        (data) => {
          toastSuccess.fire({
            title: data.message,
          });
          getAllUsers();
          setmodalOpen(false);
          setaction('')
        },
        (errorMessage) => {
          toastError.fire({
            title: errorMessage,
          });
        }
      );
    } else if (action == "Edit") {
      if( formData.user_password && String(formData?.user_password)?.length < 8){
        toastError.fire({
            title: 'Password should be at least 8 characters',
          });
          return false
        }
      requestHandler(
        ()=>{return UpdateUser(formData)},
        (data)=>{
          toastSuccess.fire({
            title : data.message
          })
          getAllUsers();
          setmodalOpen(false)
          setaction('')
        },
        (errorMessage) => {
          toastError.fire({
            title: errorMessage,
          });
        }
      )
    }
  }

  // function to empty the "data" state
  function resetDatastate() {
    reset(new userModel());
  }

  function resetFilterStates(){
    filterReset(new filterType());
    getAllUsers();
  }

  // function to pass to the modal close button
  // this closes the modal and clears the "data" state
  function modalClose() {
    setmodalOpen(false);
    setaction('');
    resetDatastate();
  }

   const onFilterFormSubmit = (formData: filterType)=>{
      // setPage(0)
      requestHandler(
        async () => {
          return await GetAllUsers({...formData,page:0});
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

   useEffect(() => {
    getAllUsers();
  }, [page]);
   
  useEffect(() => {
    getAllUsers();
    getAllRoles();
    getAllDesignations();
    getAllTimeShift();
    GetSalaryStructures();
  }, []);

  useEffect(() => {
    if (action=='Edit') {
      console.log("edit");
      
      reset((prev) => ({
        ...prev,
        user_password: '',
      }));
    }
  }, [action]);

  // The auto-selected, non-changeable branch applies only to staff roles.
  const selectedRole = roles.find(
    (r) => Number(r.role_id) === Number(watch("role_id"))
  );
  const isStaffRole = selectedRole?.is_staff == 1;

  return (
    <div>
      {/* template header */}
      <div className="mx-3 my-3 shadow px-4 py-1 border rounded ">
        {/* ===== Head ===== */}
        <div className="flex items-center justify-between flex-wrap">
          <div>
            <h2 className="text-2xl font-medium text-cyan-950 pl-2 mt-3 lg:mt-0 py-5">
              Users
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
              Add User
            </AddButton>
          </div>
        </div>

        <hr className ="my-3 border-gray-300 " />
        {/* ===== filter ===== */}
        <form
          noValidate
          onSubmit={
            handleFilterSubmit(onFilterFormSubmit)
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-5 items-end">
            <InputField
              {...getFilterAttributes('user_name',{
                onChange:(e:ChangeEvent<HTMLInputElement>)=>{
                  filterReset((prev) => ({ ...prev, user_name: e.target.value }));
                }
              })}
              label="Search by email"
            />
            <SelectField
              label="Roles"
              {...getFilterAttributes('role_id',{
                onChange:(e:ChangeEvent<HTMLInputElement>)=>{
                  filterReset((prev) => ({
                    ...prev,
                    role_id: Number(e.target.value),
                  }))
                }
              })}
            >
              <option value="">Select role</option>
              {roles.filter(r =>r.is_active==1).map((_, index) => (
                <option key={index} value={_.role_id?.toString()}>
                  {" "}
                  {_.role_name}
                </option>
              ))}{" "}
            </SelectField>
            <InputField
                label="Page limit"
                {...getFilterAttributes('limit',{
                  onChange:(e:ChangeEvent<HTMLInputElement>)=>{
                    filterReset((prev) => ({
                      ...prev,
                      limit: Number(e.target.value),
                    }))
                  }
                })}
            />
            <div className="flex ">
              {/* <FilterButton onClick={()=>{}}></FilterButton> */}
              <FilterResetButton
                type="button"
                onClick={() => {
                  setPage(0);
                  resetFilterStates();
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
            <th>Full name</th>
            <th>Email address</th>
            <th>Role</th>
            <th>Designation</th>
            <th>Profile image</th>
            <th>User active</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {dataArray.map((_, index) => {
            const {limit}=getValues();
            return (
              <tr key={index}>
                <td>{page * limit + (index + 1)}</td>
                <td title={_.user_id?.toString()}>
                  <b>{_.full_name}</b>
                </td>
                <td title={_.user_id?.toString()}>
                  <b>{_.user_name}</b>
                </td>
                {/* <td>{_.user_id}</td> */}
                <td>{_.role_name}</td>
                <td>{_.desig_name}</td>
                <td>
                  <img
                    src={getImageUrl(_?.imageFile, user?.s3_cloudfront_url, profileImg)}
                    className="object-cover w-10 h-10 rounded-full border border-yellow-600"
                    alt="Preview"
                  />
                </td>
                <td>
                  {_.user_active ? (
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
                      reset({..._, joining_date:_.joining_date ? _.joining_date.split(' ')[0] : ''});
                      setmodalOpen(true);
                    }}
                    onEdit={() => {
                      setaction("Edit");
                      reset({..._, joining_date:_.joining_date ? _.joining_date.split(' ')[0] : ''});
                      // setdata((prevData) => ({
                      //   ...prevData,
                      //   imageFile:_.imageFile
                      // }));
                      setmodalOpen(true);
                    }}
                    view
                    edit
                    // deletee
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>

      {/* Modal for Add , Edit and View */}
      {modalOpen && (
        <Modal heading={`${action} User`} onClose={modalClose}>
          <form noValidate onSubmit={handleSubmit(onFormSubmit)}>
            <fieldset disabled={action === "View"}>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4">
                {/* <SelectField {...FieldAttributes('entity_id')} required label="Entity" disabled={action != 'Add'}>
                <option value="">Select Branch</option>
                {
                  entityArray.map(entity =>{
                    if(entity.entity_id){
                      return <option value={entity.entity_id}>{entity.name}</option>
                    }
                  }
                 )
                }
              </SelectField> */}
                {/* Only for staff roles: the branch is auto-selected to the
                    branch the user is being added to (the branch currently
                    selected in the header) and is non-changeable here. */}
                {isStaffRole && (
                  <SelectField
                    label="Branch"
                    disabled
                    value={
                      action === "Add"
                        ? String(currentBranch ?? "")
                        : String(watch("branch_id") ?? "")
                    }
                  >
                    <option value="">Select branch</option>
                    {branchAccess
                      .filter((_) => Number(_.is_active) == 1)
                      .map((branch, index) => (
                        <option key={index} value={String(branch.branch_id)}>
                          {branch.name}
                        </option>
                      ))}
                  </SelectField>
                )}
                <InputField
                  label="Full name"
                  {...getFieldAttributes("full_name",{
                    required:'Full name is required'
                  })}
                />
                <InputField
                  label="Email address (used for login)"
                  type="email"
                  {...getFieldAttributes("user_name",{
                    required:'Email address is required'
                  })}
                />

                {action !== "View" && (
                   <InputField
                    // Password required only in 'Add' mode
                   label={`Password ${action === "Edit" ? "(If required)" : ""}`}
                   name="user_password"
                   {...getFieldAttributes('user_password',{
                    onChange:(e:ChangeEvent<HTMLInputElement>)=>{
                      const pass = e.target.value || "";
                      reset((prev) => ({
                        ...prev,
                        user_password: pass, 
                      }));
                    }
                   })}
                   required={action == "Add"}
                 />
                )}

                <SelectField
                  {...getFieldAttributes("role_id",{
                    required:'Role is required'
                  })}
                  label="Role"
                  // disabled={action != "Add"}
                >
                  <option value="">Select role </option>
                  {roles.filter(r =>r.is_active==1).map((role, i) => (
                    <option value={Number(role.role_id)} key={i}>
                      {role.role_name}
                    </option>
                  ))}
                </SelectField>
                <SelectField
                  label="Designation"
                  {...getFieldAttributes("desig_id",{
                    required:'Designation is required'
                  })}
                >
                  <option value="">Select designation</option>
                  {designationMaster.filter(d=>d.is_active==1).map((_) => (
                    <option key={_.desig_id} value={_.desig_id?.toString()}>
                      {_.name}
                    </option>
                  ))}
                </SelectField>

                <InputField
                  label="Joining date"
                  type="date"
                  {...getFieldAttributes("joining_date")}
                />

                <InputField
                  label="PAN number"
                  {...getFieldAttributes("pan_num", {
                    // required:'PAN number is required'
                  })}
                />

                <InputField
                  label="UAN number"
                  {...getFieldAttributes("uan")}
                />

                <InputField
                  label="ESI number"
                  {...getFieldAttributes("esi")}
                />

                <SelectField
                  label="Shift"
                  // disabled={action != "Add"}
                  {...getFieldAttributes("shift_code",{
                    // required:'Designation is required'
                  })}
                >
                  <option value="">Select shift</option>
                  {Shifts.map((_) => (
                    <option key={_.shift_code} value={_.shift_code}>
                      {_.shift_name} {_.is_continuous !== 1
                    ? (
                      // Continuous Shift: Show only the single block time
                      <span className="text-xs text-gray-500 block">
                        ({(String(_.first_half_start))} - {(String(_.first_half_end))})
                      </span>
                    )
                    : (
                      // Broken Shift: Show both halves
                      <span className="text-xs text-gray-500 block">
                        ({(String(_.first_half_start))} / {(String(_.first_half_end))}) -
                        ({(String(_.second_half_start))} / {(String(_.second_half_end))})
                      </span>
                    )
                  }
                    </option>
                  ))}
                </SelectField>

                <SelectField
                  {...getFieldAttributes("emp_structure_code")}
                  label="Salary structure code"
                >
                  <option value="">Select code</option>
                  {structureCode.map((_, i) => (
                    <option key={i} value={_.structure_code?.toString()}>
                      {_.structure_code} - {_.structure_desc}
                    </option>
                  ))}
                </SelectField>

                <SelectField
                  {...getFieldAttributes("reporting_to", {
                    // required:'Reporting to is required'
                  })}
                  label="Reporting to"
                >
                  <option value="">Select</option>
                  {dataArray?.filter(f => f.user_active != 0).map((_, i) => (
                    <option key={i} value={_.user_id?.toString()}>
                      {_.full_name}
                    </option>
                  ))}
                </SelectField>
            { action !='View' &&<DragAndDropFileInput   file={ ImageFilewatch  } 
                // desc=`${}`"Upload user profile image "
                // desc={`${action=='Add' ? 'Upload user profile image':'Edit profile image'}`}
                fileTypeLable="Image"
                accept="image/*" 
                onFileUpload={(data : File)=>{
                  const imageUrl = URL.createObjectURL(data)
                  setimageUrl(imageUrl);
                  reset((prev) => ({
                      ...prev,
                      imageFile: data,
                    }));}
                }
              />}
                { action === 'Edit' && (
                        <div className="flex">
                            <div className="w-16 h-16 border mt-3 ml-10 border-gray-300 rounded-full overflow-hidden flex items-center justify-center">
                                <img 
                                    src={getImageUrl(imageurl || ImageFilewatch, user?.s3_cloudfront_url, profileImg)} 
                                    width={65} 
                                    height={50} 
                                    className="object-cover w-full h-full" 
                                    alt="Preview"
                                />
                            </div>
                        </div>
                    )}
                {action === "Edit" && (
                  <SelectField
                    {...getFieldAttributes("user_active",{
                      required :'Is active required'
                    })}
                    required
                    label="Is active"
                  >
                    <option value="0">In active</option>
                    <option value="1">Active</option>
                  </SelectField>
                )}

                <>
                  <div className="py-2 mt-4 mb-3 font-semibold text-center text-gray-700 bg-gray-100 rounded-lg col-span-full">
                    Bank Details
                  </div>

                  <SelectField
                    placeholder="Eg:Canara bank"
                    label="Bank name"
                    {...getFieldAttributes("bank_name")}
                  >
                    <option value="">Select Bank</option>
                    {bankName?.map((_) => (
                      <option key={_.BANK_CODE} value={_.BANK_CODE}>
                        {_.BANK_DESC}
                      </option>
                    ))}
                  </SelectField>

                  <SelectField
                    placeholder="Eg:saving bank"
                    label="Bank Ac/type."
                    {...getFieldAttributes("bank_acc_type")}
                  >
                    <option value="">Select Account Type</option>
                    {bankAccType?.map((_) => (
                      <option key={_.ACNT_TYPE} value={_.ACNT_TYPE}>
                        {_.ACNT_DESC}
                      </option>
                    ))}
                  </SelectField>

                  <InputField
                    placeholder="Eg:0603176683758"
                    label="Bank Ac/no."
                    {...getFieldAttributes("bank_acc_num")}
                  />

                  <div className="relative">
                    <InputField
                      placeholder="Eg:UTIB0000124"
                      label="Bank IFSC code"
                      {...getFieldAttributes("bank_ifsc_code")}
                    />
                    {ifscLoading && (
                      <p className="absolute top-0 right-2 text-[11px] font-medium text-violet-600 z-10 whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px] text-right">
                        Fetching bank details...
                      </p>
                    )}
                    {ifscVerified && ifscDetails && (
                      <p className="absolute top-0 right-2 text-[11px] font-medium text-green-600 z-10 whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px] text-right" title={`✓ Verified: ${ifscDetails.BANK} - ${ifscDetails.BRANCH} (${ifscDetails.CITY})`}>
                        ✓ Verified: {ifscDetails.BANK} - {ifscDetails.BRANCH} ({ifscDetails.CITY})
                      </p>
                    )}
                    {ifscError && (
                      <p className="absolute top-0 right-2 text-[11px] font-medium text-red-500 z-10 whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px] text-right">
                        {ifscError}
                      </p>
                    )}
                  </div>

                  <InputField
                    placeholder="Eg:santtekatte"
                    label="Bank branch name."
                    {...getFieldAttributes("bank_branch_name")}
                  />
                </>
              </div>
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

export default Users;

