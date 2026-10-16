import React from 'react';
import Modal from '../Modal/Modal';
import Button, { DownloadExcell } from '../Button/Button';
import { DragAndDropFileInput } from '../Input/Input';
import csvImg from '../../assets/file.svg'
interface ThisCompProps {
    modalOpen: boolean;
    onClose: () => void;
    file?: File | undefined;
    setFile?: (file: File) => void;
    exportFile?: string;
    onFileUpload : (file: File | undefined) => void ;
}

const ImportExportFile: React.FC<ThisCompProps> = ({
    modalOpen,
    onClose,
    file,
    // setFile,
    exportFile,
    onFileUpload
}) => {

    return (
        <div>
            {
                modalOpen &&
                <Modal heading='Select Option' onClose={()=>{onClose();}}>
                    {
                        !file &&
                        <div className=' grid md:grid-cols-2 gap-4' >
                            <div className='bg-gray-100 rounded-md px-10 py-6 pt-10 text-center flex flex-col align-middle justify-between'>
                                <div>
                                    <p className='font-semibold'>Download Excel Template</p>
                                    <p className='font-regular text-sm mt-3'>Template Excell file to fill with your data.</p>
                                    <p className='font-regular text-xs mt-3 lg:px-16 pb-2'>If you're starting from scratch or need a template,click on "Download Template" to obtain a pre-formatted Excell file.</p>
                                </div>
                                <div className="border-t border-gray-300 pt-5">
                                    {exportFile ? <DownloadExcell link={exportFile}/> : <span className='text-sm'>No template is configured for this import.</span>}
                                </div>
                            </div>
                            <div className='bg-gray-100 rounded-md px-10 py-6 pt-10 text-center flex flex-col align-middle justify-between'>
                                <div>
                                    <p className='font-semibold'>Upload Excell</p>
                                    <p className='font-regular text-sm mt-3'>Upload Your existing Excel file.</p>
                                    <p className='font-regular text-xs mt-3 lg:px-16 pb-2'>If you already have your data in an excel file, Click on "Import Excel" to Upload your file directly.</p>
                                </div>
                                <div>
                                    <DragAndDropFileInput file={file} onFileUpload={onFileUpload} className='mt-10 h-[100px] py-3 flex flex-col align-middle justify-between'/>
                                </div>
                            </div>
                        </div>
                    }
                    {
                        file &&
                        <div className="bg-gray-100 p-3">
                            <div className="pt-10 flex flex-col items-center justify-center ">
                                <img className='w-[50px]' src={csvImg} alt="" />
                                <p className='mt-4'>{file.name}</p>
                            </div>
                            <hr className='border-gray-300 mt-4' />
                            <div className="flex items-center justify-center pt-4">
                                <Button varient='red' onClick={()=>{onFileUpload(undefined);onClose(); }}>Cancel</Button>
                                <Button varient='light' onClick={()=>{onFileUpload(undefined)}}>Upload New</Button>
                                <Button varient='blue'>Upload</Button>
                            </div>
                        </div>
                    }
                    
                    <p className='mt-3 text-sm text-violet-900'>Note:</p>
                    <ul className='list-disc pl-5 text-xs'>
                        <li ><p>Only .csv file type accepted.</p></li>
                        <li ><p>The Downloaded template ensures correct formatting for a smooth import.</p></li>
                        <li><p>Make sure your existing Excel file follows the required format for successful data import.</p></li>
                    </ul>
                </Modal>
            }
        </div>
    );
};

export default ImportExportFile;

