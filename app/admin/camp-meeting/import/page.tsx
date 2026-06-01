'use client'

import { Suspense, useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { useActiveCampYear } from '@/lib/hooks/use-camp'
import { getAllCampYears } from '@/lib/actions/camp'
import { importCampRegistrations, parseExcelFile } from '@/lib/actions/camp-import'
import { CampYear, CampRegistrationForm } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingSpinner } from '@/components/ui/loading'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertCircle, Download } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
    autoDetectGoogleFormColumnMapping,
    IGNORE_GOOGLE_FORM_IMPORT_FIELD,
    isBlankGoogleFormImportRow,
    isIgnorableGoogleFormImportRow,
    mapGoogleFormImportRow,
    validateGoogleFormImportRow,
} from '@/lib/camp/google-form-import'

interface ImportRow {
    [key: string]: any
    _rowIndex: number
    _errors?: string[]
    _warnings?: string[]
}

interface ImportResult {
    total: number
    successful: number
    failed: number
    skipped: number
    warned: number
    errors: Array<{ row: number; errors: string[] }>
    skipped_rows: Array<{ row: number; reason: string }>
}

function CampImportPageContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const yearIdFromRoute = searchParams.get('year')
    const { toast } = useToast()
    const { user, loading: authLoading } = useAuth()
    const { campYear: activeCampYear, loading: yearLoading } = useActiveCampYear()
    const [selectedYear, setSelectedYear] = useState<CampYear | null>(null)
    const [availableYears, setAvailableYears] = useState<CampYear[]>([])
    const [file, setFile] = useState<File | null>(null)
    const [parsedData, setParsedData] = useState<ImportRow[]>([])
    const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})
    const [previewData, setPreviewData] = useState<ImportRow[]>([])
    const [importing, setImporting] = useState(false)
    const [importResult, setImportResult] = useState<ImportResult | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Load available camp years
    useEffect(() => {
        loadCampYears()
    }, [])

    useEffect(() => {
        if (!availableYears.length) return

        if (yearIdFromRoute) {
            const year = availableYears.find((item) => item.id === yearIdFromRoute)
            if (year) {
                setSelectedYear(year)
                return
            }
        }

        if (!yearIdFromRoute && activeCampYear && !selectedYear) {
            setSelectedYear(activeCampYear)
        }
    }, [availableYears, yearIdFromRoute, activeCampYear, selectedYear])

    function handleYearChange(value: string) {
        const year = availableYears.find((item) => item.id === value) ?? null
        setSelectedYear(year)

        const params = new URLSearchParams(searchParams.toString())
        if (year) {
            params.set('year', year.id)
        } else {
            params.delete('year')
        }

        const query = params.toString()
        router.replace(query ? `/admin/camp-meeting/import?${query}` : '/admin/camp-meeting/import', {
            scroll: false,
        })
    }

    async function loadCampYears() {
        try {
            const { data, error } = await getAllCampYears()
            if (error) throw new Error(error)
            setAvailableYears(data || [])
        } catch (error: unknown) {
            console.error('Error loading camp years:', error)
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to load camp years',
            })
        }
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (!selectedFile) return

        // Validate file type
        const validTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'application/vnd.ms-excel', // .xls
            'text/csv', // .csv
        ]
        const validExtensions = ['.xlsx', '.xls', '.csv']

        const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'))
        if (!validExtensions.includes(fileExtension)) {
            toast({
                variant: 'destructive',
                title: 'Invalid File Type',
                description: 'Please upload an Excel file (.xlsx, .xls) or CSV file (.csv)',
            })
            return
        }

        setFile(selectedFile)
        parseFile(selectedFile)
    }

    const parseFile = async (file: File) => {
        try {
            const upload = new FormData()
            upload.append('file', file)
            const result = await parseExcelFile(upload)

            if (!result.success || !result.headers || !result.rows) {
                toast({
                    variant: 'destructive',
                    title: 'Parse Error',
                    description: result.error || 'Failed to parse Excel file',
                })
                return
            }

            // Convert rows to ImportRow format
            const headers = result.headers
            const rows = result.rows.map((row, index) => {
                const rowObj: ImportRow = { _rowIndex: index + 2 } // +2 because Excel rows start at 1 and we skip header
                headers.forEach((header, colIndex) => {
                    rowObj[header] = row[colIndex] || ''
                })
                return rowObj
            })

            const populatedRows = rows.filter((row) => !isBlankGoogleFormImportRow(row))
            setParsedData(populatedRows)
            setPreviewData(populatedRows.slice(0, 5))
            setImportResult(null)

            // Auto-detect column mapping
            autoDetectMapping(headers)

            toast({
                title: 'File Parsed',
                description: `Found ${populatedRows.length} populated rows (${rows.length - populatedRows.length} blank rows ignored). Please review the column mapping.`,
            })
        } catch (error: any) {
            console.error('Error parsing file:', error)
            toast({
                variant: 'destructive',
                title: 'Parse Error',
                description: error.message || 'Failed to parse Excel file',
            })
        }
    }

    const autoDetectMapping = (headers: string[]) => {
        setColumnMapping(autoDetectGoogleFormColumnMapping(headers))
    }

    const validateRow = (row: ImportRow) => {
        return validateGoogleFormImportRow(getMappedRow(row))
    }

    const getMappedRow = (row: ImportRow): Partial<CampRegistrationForm> => {
        return mapGoogleFormImportRow(row, columnMapping)
    }

    const validateAllRows = () => {
        const validated = parsedData.map(row => {
            const { blocking, warnings } = validateRow(row)
            return { ...row, _errors: blocking, _warnings: warnings }
        })
        setParsedData(validated)
        setPreviewData(validated.slice(0, 5))

        const blockingCount = validated.filter(r => r._errors && r._errors.length > 0).length
        const warningCount = validated.filter(r => r._warnings && r._warnings.length > 0).length

        if (blockingCount > 0) {
            toast({
                variant: 'destructive',
                title: 'Validation Errors',
                description: `${blockingCount} rows are missing required data (name). Fix those before importing.`,
            })
        } else if (warningCount > 0) {
            toast({
                title: 'Ready to Import',
                description: `${warningCount} rows have invalid contact info but will still be imported and flagged in the portal.`,
            })
        } else {
            toast({
                title: 'Validation Passed',
                description: 'All rows are valid and ready to import.',
            })
        }
    }

    const handleImport = async () => {
        if (!selectedYear) {
            toast({
                variant: 'destructive',
                title: 'No Camp Year Selected',
                description: 'Please select a camp year to import data into',
            })
            return
        }

        if (parsedData.length === 0) {
            toast({
                variant: 'destructive',
                title: 'No Data',
                description: 'Please upload and parse an Excel file first',
            })
            return
        }

        setImporting(true)
        setImportResult(null)

        try {
            const ignoredRows = parsedData.filter((row) =>
                isIgnorableGoogleFormImportRow(row, columnMapping)
            )
            const participantRows = parsedData.filter(
                (row) => !isIgnorableGoogleFormImportRow(row, columnMapping)
            )

            const validatedRows = participantRows.map((row) => {
                const { blocking, warnings } = validateRow(row)
                return {
                    ...row,
                    _errors: blocking,
                    _warnings: warnings,
                }
            })

            const validRows = validatedRows
                .filter((row) => !row._errors || row._errors.length === 0)
                .map((row) => ({
                    ...getMappedRow(row),
                    source_row: row._rowIndex,
                    import_warnings: row._warnings,
                }))

            const result = await importCampRegistrations(selectedYear.id, validRows)

            const validationErrors = validatedRows
                .filter((row) => row._errors && row._errors.length > 0)
                .map((row) => ({
                    row: row._rowIndex,
                    errors: row._errors || [],
                }))

            const ignoredSkippedRows = ignoredRows.map((row) => ({
                row: row._rowIndex,
                reason: 'No participant data in row',
            }))

            const finalResult: ImportResult = {
                total: parsedData.length,
                successful: result.successful,
                failed: result.failed + validationErrors.length,
                skipped: result.skipped + ignoredSkippedRows.length,
                warned: result.warned,
                errors: [...result.errors, ...validationErrors],
                skipped_rows: [...result.skipped_rows, ...ignoredSkippedRows],
            }

            setImportResult(finalResult)

            if (finalResult.successful > 0 || finalResult.skipped > 0) {
                toast({
                    title: 'Import Complete',
                    description: `Imported ${finalResult.successful} registrations${finalResult.warned > 0 ? ` (${finalResult.warned} flagged with invalid contact)` : ''}. ${finalResult.skipped} duplicate rows were skipped.`,
                })
            }

            if (finalResult.failed > 0) {
                toast({
                    variant: 'destructive',
                    title: 'Import Completed with Errors',
                    description: `${finalResult.failed} rows failed to import. Check the error details below.`,
                })
            }
        } catch (error: any) {
            console.error('Import error:', error)
            toast({
                variant: 'destructive',
                title: 'Import Failed',
                description: error.message || 'Failed to import data',
            })
        } finally {
            setImporting(false)
        }
    }

    // Redirect if not authenticated
    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <LoadingSpinner />
            </div>
        )
    }

    if (!user) {
        router.push('/auth?redirect=' + encodeURIComponent('/admin/camp-meeting/import'))
        return null
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="max-w-7xl mx-auto p-6 space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push('/admin/camp-meeting')}
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>
                        <div>
                            <h1 className="text-4xl font-bold tracking-tight text-slate-900">
                                Import Historical Camp Data
                            </h1>
                            <p className="text-muted-foreground mt-1">
                                Import registrations from Excel files for previous camp years
                            </p>
                        </div>
                    </div>
                </div>

                {/* Step 1: Select Camp Year */}
                <Card>
                    <CardHeader>
                        <CardTitle>Step 1: Camp Year</CardTitle>
                        <CardDescription>
                            Choose which camp year to import the data into. You can switch years before uploading.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Camp Year</Label>
                                <Select value={selectedYear?.id || ''} onValueChange={handleYearChange}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a camp year" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableYears.map((year) => (
                                            <SelectItem key={year.id} value={year.id}>
                                                Camp Meeting {year.year} - {year.theme}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {yearIdFromRoute && selectedYear?.id === yearIdFromRoute ? (
                                    <p className="text-xs text-muted-foreground">
                                        Preselected from Camp Years. Pick another year above to import a different archive.
                                    </p>
                                ) : null}
                            </div>
                            {!selectedYear && availableYears.length === 0 && (
                                <p className="text-sm text-muted-foreground">
                                    No camp years found. <Button variant="link" onClick={() => router.push('/admin/camp-meeting/years')}>Create one first</Button>
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Step 2: Upload File */}
                <Card>
                    <CardHeader>
                        <CardTitle>Step 2: Upload Excel File</CardTitle>
                        <CardDescription>
                            Upload an Excel file (.xlsx, .xls) or CSV file containing registration data
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                                <FileSpreadsheet className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                                <Button
                                    onClick={() => fileInputRef.current?.click()}
                                    variant="outline"
                                >
                                    <Upload className="h-4 w-4 mr-2" />
                                    Choose File
                                </Button>
                                {file && (
                                    <p className="mt-2 text-sm text-slate-600">
                                        Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                                    </p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Step 3: Column Mapping */}
                {parsedData.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Step 3: Map Columns</CardTitle>
                            <CardDescription>
                                Map Excel columns to database fields. Auto-detection is applied, but you can adjust as needed.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    {Object.keys(parsedData[0] || {}).filter(key => key !== '_rowIndex' && key !== '_errors').map(excelCol => (
                                        <div key={excelCol} className="space-y-2">
                                            <Label>Excel Column: {excelCol}</Label>
                                            <Select
                                                value={columnMapping[excelCol] || IGNORE_GOOGLE_FORM_IMPORT_FIELD}
                                                onValueChange={(value) => {
                                                    setColumnMapping({ ...columnMapping, [excelCol]: value })
                                                }}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select field" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value={IGNORE_GOOGLE_FORM_IMPORT_FIELD}>-- Ignore --</SelectItem>
                                                    <SelectItem value="first_name">First Name</SelectItem>
                                                    <SelectItem value="last_name">Last Name</SelectItem>
                                                    <SelectItem value="full_name">Full Name</SelectItem>
                                                    <SelectItem value="email">Email</SelectItem>
                                                    <SelectItem value="phone">Phone</SelectItem>
                                                    <SelectItem value="sex">Sex/Gender</SelectItem>
                                                    <SelectItem value="date_of_birth">Date of Birth</SelectItem>
                                                    <SelectItem value="age_bracket">Age Bracket</SelectItem>
                                                    <SelectItem value="role">Role</SelectItem>
                                                    <SelectItem value="address_school_work">Address/School/Work</SelectItem>
                                                    <SelectItem value="education_level">Education Level</SelectItem>
                                                    <SelectItem value="residence">Residence</SelectItem>
                                                    <SelectItem value="times_attended">Times Attended</SelectItem>
                                                    <SelectItem value="parent_name">Parent Name</SelectItem>
                                                    <SelectItem value="parent_contact">Parent Contact</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    ))}
                                </div>
                                <Button onClick={validateAllRows} variant="outline">
                                    Validate All Rows
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Step 4: Preview */}
                {previewData.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Step 4: Preview Data</CardTitle>
                            <CardDescription>
                                Preview of first 5 rows. {parsedData.length} total rows ready to import.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Row</TableHead>
                                            <TableHead>First Name</TableHead>
                                            <TableHead>Last Name</TableHead>
                                            <TableHead>Parent Name</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Phone</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {previewData.map((row, idx) => {
                                            const mapped = getMappedRow(row)
                                            const hasErrors = row._errors && row._errors.length > 0
                                            const hasWarnings = row._warnings && row._warnings.length > 0
                                            return (
                                                <TableRow
                                                    key={idx}
                                                    className={
                                                        hasErrors
                                                            ? 'bg-red-50'
                                                            : hasWarnings
                                                              ? 'bg-amber-50'
                                                              : ''
                                                    }
                                                >
                                                    <TableCell>{row._rowIndex}</TableCell>
                                                    <TableCell>{mapped.first_name || 'N/A'}</TableCell>
                                                    <TableCell>{mapped.last_name || 'N/A'}</TableCell>
                                                    <TableCell>{mapped.parent_name || 'N/A'}</TableCell>
                                                    <TableCell>{mapped.email || 'N/A'}</TableCell>
                                                    <TableCell>{mapped.phone || 'N/A'}</TableCell>
                                                    <TableCell>{mapped.role || 'N/A'}</TableCell>
                                                    <TableCell>
                                                        {hasErrors ? (
                                                            <Badge variant="destructive">
                                                                <XCircle className="h-3 w-3 mr-1" />
                                                                {row._errors?.length} error(s)
                                                            </Badge>
                                                        ) : hasWarnings ? (
                                                            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-900">
                                                                <AlertCircle className="h-3 w-3 mr-1" />
                                                                {row._warnings?.length} warning(s)
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="default">
                                                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                                                Valid
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Step 5: Import */}
                {parsedData.length > 0 && selectedYear && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Step 5: Import Data</CardTitle>
                            <CardDescription>
                                Ready to import {parsedData.length} registrations into Camp Meeting {selectedYear.year}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button
                                onClick={handleImport}
                                disabled={importing || !selectedYear}
                                className="w-full"
                                size="lg"
                            >
                                {importing ? (
                                    <>
                                        <LoadingSpinner className="mr-2" />
                                        Importing...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="mr-2 h-4 w-4" />
                                        Import {parsedData.length} Registrations
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Import Results */}
                {importResult && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Import Results</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                                    <div className="text-center p-4 bg-slate-50 rounded-lg">
                                        <div className="text-2xl font-bold text-primary">{importResult.total}</div>
                                        <div className="text-sm text-slate-600">Total Rows</div>
                                    </div>
                                    <div className="text-center p-4 bg-green-50 rounded-lg">
                                        <div className="text-2xl font-bold text-green-600">{importResult.successful}</div>
                                        <div className="text-sm text-slate-600">Imported</div>
                                    </div>
                                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                                        <div className="text-2xl font-bold text-yellow-700">{importResult.warned}</div>
                                        <div className="text-sm text-slate-600">Invalid Contact</div>
                                    </div>
                                    <div className="text-center p-4 bg-amber-50 rounded-lg">
                                        <div className="text-2xl font-bold text-amber-600">{importResult.skipped}</div>
                                        <div className="text-sm text-slate-600">Skipped Duplicates</div>
                                    </div>
                                    <div className="text-center p-4 bg-red-50 rounded-lg">
                                        <div className="text-2xl font-bold text-red-600">{importResult.failed}</div>
                                        <div className="text-sm text-slate-600">Failed</div>
                                    </div>
                                </div>

                                {importResult.skipped_rows.length > 0 && (
                                    <div className="space-y-2">
                                        <h4 className="font-semibold">Skipped duplicates:</h4>
                                        <div className="max-h-60 overflow-y-auto space-y-1">
                                            {importResult.skipped_rows.map((skippedRow, idx) => (
                                                <div key={idx} className="text-sm p-2 bg-amber-50 rounded border border-amber-200">
                                                    <strong>Row {skippedRow.row}:</strong> {skippedRow.reason}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {importResult.errors.length > 0 && (
                                    <div className="space-y-2">
                                        <h4 className="font-semibold">Errors:</h4>
                                        <div className="max-h-60 overflow-y-auto space-y-1">
                                            {importResult.errors.map((error, idx) => (
                                                <div key={idx} className="text-sm p-2 bg-red-50 rounded border border-red-200">
                                                    <strong>Row {error.row}:</strong> {error.errors.join(', ')}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}

export default function CampImportPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-[40vh] items-center justify-center">
                    <LoadingSpinner />
                </div>
            }
        >
            <CampImportPageContent />
        </Suspense>
    )
}
