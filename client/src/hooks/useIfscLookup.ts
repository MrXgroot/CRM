import { useState, useEffect } from 'react';
import { getIfscDetails, RazorpayIfscResponse } from '../utils/api';

export interface UseIfscLookupResult {
  loading: boolean;
  details: RazorpayIfscResponse | null;
  error: string | null;
  verified: boolean;
  fetchIfsc: (code?: string) => Promise<RazorpayIfscResponse | null>;
}

export const useIfscLookup = (ifscCode?: string | null): UseIfscLookupResult => {
  const [loading, setLoading] = useState<boolean>(false);
  const [details, setDetails] = useState<RazorpayIfscResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState<boolean>(false);

  const fetchIfsc = async (codeOverride?: string): Promise<RazorpayIfscResponse | null> => {
    const targetCode = codeOverride !== undefined ? codeOverride : ifscCode;
    if (!targetCode) {
      setDetails(null);
      setError(null);
      setVerified(false);
      return null;
    }

    const cleanCode = targetCode.trim().toUpperCase();
    if (cleanCode.length !== 11) {
      setDetails(null);
      setVerified(false);
      if (cleanCode.length > 0) {
        setError('IFSC code must be 11 characters');
      } else {
        setError(null);
      }
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await getIfscDetails(cleanCode);
      if (res && res.IFSC) {
        setDetails(res);
        setVerified(true);
        setError(null);
        setLoading(false);
        return res;
      } else {
        setDetails(null);
        setVerified(false);
        setError('Invalid IFSC Code');
        setLoading(false);
        return null;
      }
    } catch (err: any) {
      setDetails(null);
      setVerified(false);
      setError(err?.message || 'Failed to fetch bank details');
      setLoading(false);
      return null;
    }
  };

  useEffect(() => {
    if (ifscCode && ifscCode.trim().length === 11) {
      fetchIfsc(ifscCode);
    } else if (!ifscCode || ifscCode.trim().length === 0) {
      setDetails(null);
      setError(null);
      setVerified(false);
    }
  }, [ifscCode]);

  return { loading, details, error, verified, fetchIfsc };
};
