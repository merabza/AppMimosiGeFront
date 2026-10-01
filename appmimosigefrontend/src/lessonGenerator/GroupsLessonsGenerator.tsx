//GroupsLessonsGenerator.tsx

import { useEffect, useState, type FC } from "react";
import { Button, Spinner } from "react-bootstrap";
import { Link } from "react-router-dom";
import AlertMessages from "../appcarcass/common/AlertMessages";
import { useAppDispatch } from "../appcarcass/redux/hooks";
import { clearAlert, EAlertKind } from "../appcarcass/redux/slices/alertSlice";
import {
    useGenerateAllGroupsLessonsMutation,
    useGenerateDirtyGroupsLessonsMutation,
} from "../redux/api/lessonGeneratorApi";
import type { ILessonsGeneration } from "../redux/types/lessonGeneratorTypes";
import LessonsGenerationResult from "./LessonsGenerationResult";
import {
    lessonGeneratorLogRoute,
    useCanRecountAllGroupsLessons,
} from "./lessonGeneration";

//Access-ის FrmGroups-ის სათაურის ღილაკები: "ყველა ჯგუფის გაკვეთილები" (DirtyLessons-იანი ჯგუფები) და
//"გადაანგარიშება" (ყველა ჯგუფი, მხოლოდ სპეციალური უფლებით), მათი შედეგი და შეცდომები
const GroupsLessonsGenerator: FC = () => {
    const dispatch = useAppDispatch();
    const canRecountAll = useCanRecountAllGroupsLessons();
    const [generateDirty, { isLoading: generatingDirty }] =
        useGenerateDirtyGroupsLessonsMutation();
    const [generateAll, { isLoading: generatingAll }] =
        useGenerateAllGroupsLessonsMutation();
    const [generation, setGeneration] = useState<ILessonsGeneration | null>(
        null
    );
    const busy = generatingDirty || generatingAll;

    useEffect(() => {
        dispatch(clearAlert(EAlertKind.ApiMutation));
    }, [dispatch]);

    async function run(generate: () => Promise<ILessonsGeneration>) {
        dispatch(clearAlert(EAlertKind.ApiMutation));
        setGeneration(null);
        try {
            setGeneration(await generate());
        } catch {
            //შეცდომა უკვე ჩაიწერა ApiMutation-ში და ქვემოთ ჩანს
        }
    }

    return (
        <div className="mb-2">
            <div className="text-end">
                <Button
                    variant="outline-primary"
                    className="me-2"
                    disabled={busy}
                    onClick={() => run(() => generateDirty().unwrap())}
                >
                    ყველა ჯგუფის გაკვეთილები
                    {generatingDirty && <Spinner size="sm" animation="border" />}
                </Button>
                {canRecountAll && (
                    <Button
                        variant="outline-secondary"
                        className="me-2"
                        title="ყველა ჯგუფის გაკვეთილები თავიდან დაითვლება, მათ შორის იმ ჯგუფებისაც, რომლებიც არ შეცვლილა"
                        disabled={busy}
                        onClick={() => run(() => generateAll().unwrap())}
                    >
                        გადაანგარიშება
                        {generatingAll && (
                            <Spinner size="sm" animation="border" />
                        )}
                    </Button>
                )}
                <Link to={`/${lessonGeneratorLogRoute}`}>გენერატორის ლოგი</Link>
            </div>
            <AlertMessages alertKind={EAlertKind.ApiMutation} />
            {generation && (
                <LessonsGenerationResult
                    generation={generation}
                    onClose={() => setGeneration(null)}
                />
            )}
        </div>
    );
};

export default GroupsLessonsGenerator;
