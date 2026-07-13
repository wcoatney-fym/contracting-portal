-- Migration: wire up sub-agency parent_agency_id based on UNL upline data
-- 52 agencies have a direct parent that is not FYM; update their parent_agency_id accordingly.

UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202AYX00' LIMIT 1
  )
  WHERE unl_writing_number = '202A9V00';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202ACY00' LIMIT 1
  )
  WHERE unl_writing_number = '202AJA00';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202AYX00' LIMIT 1
  )
  WHERE unl_writing_number = '202BJM00';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202NEW00' LIMIT 1
  )
  WHERE unl_writing_number = '202BJN00';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202AYX00' LIMIT 1
  )
  WHERE unl_writing_number = '202DAX00';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202ACY00' LIMIT 1
  )
  WHERE unl_writing_number = '202JCS00';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202ACY00' LIMIT 1
  )
  WHERE unl_writing_number = '202JCT00';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202AYX00' LIMIT 1
  )
  WHERE unl_writing_number = '202JL300';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202AYX00' LIMIT 1
  )
  WHERE unl_writing_number = '202JLB00';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202ACY00' LIMIT 1
  )
  WHERE unl_writing_number = '202JM200';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202AYX00' LIMIT 1
  )
  WHERE unl_writing_number = '202JMB00';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202AYX00' LIMIT 1
  )
  WHERE unl_writing_number = '202JMJ00';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202AYX00' LIMIT 1
  )
  WHERE unl_writing_number = '202JNZ00';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202AYX00' LIMIT 1
  )
  WHERE unl_writing_number = '202JPC00';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202AYX00' LIMIT 1
  )
  WHERE unl_writing_number = '202JPD00';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202AYX00' LIMIT 1
  )
  WHERE unl_writing_number = '202JRM00';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202ACY00' LIMIT 1
  )
  WHERE unl_writing_number = '202JTX00';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202AYX00' LIMIT 1
  )
  WHERE unl_writing_number = '202JW200';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202AYX00' LIMIT 1
  )
  WHERE unl_writing_number = '202JX600';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202AYX00' LIMIT 1
  )
  WHERE unl_writing_number = '202KFE00';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202AYX00' LIMIT 1
  )
  WHERE unl_writing_number = '202KFZ00';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202ACY00' LIMIT 1
  )
  WHERE unl_writing_number = '202KNM00';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202ACY00' LIMIT 1
  )
  WHERE unl_writing_number = '202KPS00';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202ACY00' LIMIT 1
  )
  WHERE unl_writing_number = '202KRT00';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202NCX00' LIMIT 1
  )
  WHERE unl_writing_number = '202NEY00';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202NEG00' LIMIT 1
  )
  WHERE unl_writing_number = '202NFA00';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202NEG00' LIMIT 1
  )
  WHERE unl_writing_number = '202NFL00';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202NEG00' LIMIT 1
  )
  WHERE unl_writing_number = '202NFP00';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202GDY00' LIMIT 1
  )
  WHERE unl_writing_number = '202NFS00';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202NEW00' LIMIT 1
  )
  WHERE unl_writing_number = '202NFY00';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202NEG00' LIMIT 1
  )
  WHERE unl_writing_number = '202NG400';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202NEG00' LIMIT 1
  )
  WHERE unl_writing_number = '202NG700';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202NEG00' LIMIT 1
  )
  WHERE unl_writing_number = '202NG800';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202NEW00' LIMIT 1
  )
  WHERE unl_writing_number = '202NG900';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202NEW00' LIMIT 1
  )
  WHERE unl_writing_number = '202NHH00';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202NEW00' LIMIT 1
  )
  WHERE unl_writing_number = '202NHJ00';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202NEW00' LIMIT 1
  )
  WHERE unl_writing_number = '202NHK00';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202NE400' LIMIT 1
  )
  WHERE unl_writing_number = '202NHR00';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202NEW00' LIMIT 1
  )
  WHERE unl_writing_number = '202NKR00';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202NEW00' LIMIT 1
  )
  WHERE unl_writing_number = '202NL700';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202NEW00' LIMIT 1
  )
  WHERE unl_writing_number = '202NL800';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202NEW00' LIMIT 1
  )
  WHERE unl_writing_number = '202NLH00';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202NEW00' LIMIT 1
  )
  WHERE unl_writing_number = '202NLM00';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202NEW00' LIMIT 1
  )
  WHERE unl_writing_number = '202NM500';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202NEW00' LIMIT 1
  )
  WHERE unl_writing_number = '202NM600';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202NE400' LIMIT 1
  )
  WHERE unl_writing_number = '202NM700';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202NEW00' LIMIT 1
  )
  WHERE unl_writing_number = '202NMD00';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202NEG00' LIMIT 1
  )
  WHERE unl_writing_number = '202NML00';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202NEG00' LIMIT 1
  )
  WHERE unl_writing_number = '202NNL00';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202NEW00' LIMIT 1
  )
  WHERE unl_writing_number = '202NP400';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202NEW00' LIMIT 1
  )
  WHERE unl_writing_number = '202NPK00';
UPDATE public.hierarchy_agencies
  SET parent_agency_id = (
    SELECT id FROM public.hierarchy_agencies
    WHERE unl_writing_number = '202NBF00' LIMIT 1
  )
  WHERE unl_writing_number = '202NR900';
